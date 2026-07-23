use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const CONTRACT_VERSION: &str = "1.0";

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderName {
    Ollama,
    Groq,
    Openai,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ModelSettings {
    pub provider: ProviderName,
    pub model: String,
    pub product_name: String,
    pub max_concurrency: u8,
    pub brand_voice: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct ReviewInput {
    pub review_id: String,
    pub source_index: usize,
    pub original_text: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct AnalysisRequest {
    pub schema_version: String,
    #[serde(rename = "type")]
    pub request_type: String,
    pub job_id: String,
    pub settings: ModelSettings,
    pub reviews: Vec<ReviewInput>,
}

#[derive(Debug, thiserror::Error)]
pub enum RequestValidationError {
    #[error("지원하지 않는 메시지 계약 버전입니다.")]
    UnsupportedContract,
    #[error("분석 요청 형식이 올바르지 않습니다.")]
    InvalidRequest,
    #[error("분석할 후기는 1건부터 200건까지 입력해야 합니다.")]
    InvalidReviewCount,
    #[error("후기 식별자와 원본 순번은 작업 안에서 고유해야 합니다.")]
    DuplicateReview,
}

pub fn validate_request(request: &AnalysisRequest) -> Result<(), RequestValidationError> {
    if request.schema_version != CONTRACT_VERSION {
        return Err(RequestValidationError::UnsupportedContract);
    }
    if request.request_type != "analyze"
        || request.job_id.trim().is_empty()
        || request.job_id.len() > 100
        || request.settings.model.trim().is_empty()
        || request.settings.model.len() > 120
        || request.settings.product_name.trim().is_empty()
        || request.settings.product_name.len() > 120
        || request.settings.brand_voice.len() > 500
        || !(1..=8).contains(&request.settings.max_concurrency)
    {
        return Err(RequestValidationError::InvalidRequest);
    }
    if !(1..=200).contains(&request.reviews.len()) {
        return Err(RequestValidationError::InvalidReviewCount);
    }

    let mut review_ids = HashSet::with_capacity(request.reviews.len());
    let mut source_indexes = HashSet::with_capacity(request.reviews.len());
    for review in &request.reviews {
        if review.review_id.trim().is_empty()
            || review.review_id.len() > 100
            || review.original_text.trim().is_empty()
            || review.original_text.len() > 10_000
        {
            return Err(RequestValidationError::InvalidRequest);
        }
        if !review_ids.insert(review.review_id.as_str())
            || !source_indexes.insert(review.source_index)
        {
            return Err(RequestValidationError::DuplicateReview);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{validate_request, AnalysisRequest, ModelSettings, ProviderName, ReviewInput};

    fn request() -> AnalysisRequest {
        AnalysisRequest {
            schema_version: "1.0".to_owned(),
            request_type: "analyze".to_owned(),
            job_id: "job-1".to_owned(),
            settings: ModelSettings {
                provider: ProviderName::Ollama,
                model: "gemma4:e2b".to_owned(),
                product_name: "머그컵".to_owned(),
                max_concurrency: 4,
                brand_voice: "친절한 한국어".to_owned(),
            },
            reviews: vec![ReviewInput {
                review_id: "review-1".to_owned(),
                source_index: 0,
                original_text: "배송이 빨라요.".to_owned(),
            }],
        }
    }

    #[test]
    fn accepts_supported_contract_when_request_is_valid() {
        assert!(validate_request(&request()).is_ok());
    }

    #[test]
    fn rejects_unsupported_contract_version() {
        let mut input = request();
        input.schema_version = "9.9".to_owned();

        assert!(validate_request(&input).is_err());
    }

    #[test]
    fn rejects_duplicate_review_ids() {
        let mut input = request();
        input.reviews.push(ReviewInput {
            review_id: "review-1".to_owned(),
            source_index: 1,
            original_text: "두 번째 후기".to_owned(),
        });

        assert!(validate_request(&input).is_err());
    }
}

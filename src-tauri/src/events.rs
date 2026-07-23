use serde::Deserialize;
use serde_json::Value;

use crate::contracts::CONTRACT_VERSION;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum ReviewStatus {
    Succeeded,
    Failed,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ErrorInfo {
    code: String,
    message: String,
    #[serde(rename = "retryable")]
    _retryable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ReplyCandidate {
    candidate_id: String,
    tone: String,
    text: String,
    rationale: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ReviewAnalysis {
    sentiment: String,
    summary: String,
    key_points: Vec<String>,
    response_strategy: Vec<String>,
    reply_candidates: Vec<ReplyCandidate>,
    warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "event", rename_all = "snake_case", deny_unknown_fields)]
enum SidecarEvent {
    JobStarted {
        schema_version: String,
        job_id: String,
        total: u16,
    },
    ReviewResult {
        schema_version: String,
        job_id: String,
        review_id: String,
        source_index: usize,
        status: ReviewStatus,
        analysis: Option<Box<ReviewAnalysis>>,
        error: Option<ErrorInfo>,
    },
    JobFinished {
        schema_version: String,
        job_id: String,
        succeeded_count: u16,
        failed_count: u16,
    },
    FatalError {
        schema_version: String,
        error: ErrorInfo,
    },
}

#[derive(Debug, thiserror::Error)]
pub enum SidecarProtocolError {
    #[error("분석 서비스가 올바르지 않은 JSON 이벤트를 반환했습니다.")]
    InvalidJson(#[source] serde_json::Error),
    #[error("분석 서비스의 메시지 계약 버전이 일치하지 않습니다.")]
    UnsupportedContract,
    #[error("분석 서비스가 다른 작업의 이벤트를 반환했습니다.")]
    MismatchedJob,
    #[error("분석 서비스의 결과 상태와 데이터가 일치하지 않습니다.")]
    InvalidOutcome,
}

pub fn parse_sidecar_event(
    line: &[u8],
    expected_job_id: &str,
) -> Result<Value, SidecarProtocolError> {
    let value = serde_json::from_slice::<Value>(line).map_err(SidecarProtocolError::InvalidJson)?;
    let event = serde_json::from_value::<SidecarEvent>(value.clone())
        .map_err(SidecarProtocolError::InvalidJson)?;
    match event {
        SidecarEvent::JobStarted {
            schema_version,
            job_id,
            total,
        } => {
            validate_common(&schema_version, &job_id, expected_job_id)?;
            if !(1..=200).contains(&total) {
                return Err(SidecarProtocolError::InvalidOutcome);
            }
        }
        SidecarEvent::ReviewResult {
            schema_version,
            job_id,
            review_id,
            source_index,
            status,
            analysis,
            error,
        } => {
            validate_common(&schema_version, &job_id, expected_job_id)?;
            if review_id.trim().is_empty()
                || source_index >= 200
                || !valid_result(&status, analysis.as_deref(), error.as_ref())
            {
                return Err(SidecarProtocolError::InvalidOutcome);
            }
        }
        SidecarEvent::JobFinished {
            schema_version,
            job_id,
            succeeded_count,
            failed_count,
        } => {
            validate_common(&schema_version, &job_id, expected_job_id)?;
            if succeeded_count.saturating_add(failed_count) > 200 {
                return Err(SidecarProtocolError::InvalidOutcome);
            }
        }
        SidecarEvent::FatalError {
            schema_version,
            error,
        } => {
            if schema_version != CONTRACT_VERSION
                || error.code.trim().is_empty()
                || error.message.trim().is_empty()
            {
                return Err(SidecarProtocolError::UnsupportedContract);
            }
            if !valid_error(&error) {
                return Err(SidecarProtocolError::InvalidOutcome);
            }
        }
    }
    Ok(value)
}

fn validate_common(
    schema_version: &str,
    job_id: &str,
    expected_job_id: &str,
) -> Result<(), SidecarProtocolError> {
    if schema_version != CONTRACT_VERSION {
        return Err(SidecarProtocolError::UnsupportedContract);
    }
    if job_id != expected_job_id {
        return Err(SidecarProtocolError::MismatchedJob);
    }
    Ok(())
}

fn valid_result(
    status: &ReviewStatus,
    analysis: Option<&ReviewAnalysis>,
    error: Option<&ErrorInfo>,
) -> bool {
    match status {
        ReviewStatus::Succeeded => analysis.is_some_and(valid_analysis) && error.is_none(),
        ReviewStatus::Failed => error.is_some_and(valid_error) && analysis.is_none(),
    }
}

fn valid_analysis(analysis: &ReviewAnalysis) -> bool {
    matches!(
        analysis.sentiment.as_str(),
        "positive" | "negative" | "neutral"
    ) && !analysis.summary.trim().is_empty()
        && analysis.key_points.len() <= 5
        && (1..=4).contains(&analysis.response_strategy.len())
        && analysis.reply_candidates.len() == 3
        && analysis.reply_candidates.iter().all(|candidate| {
            !candidate.candidate_id.trim().is_empty()
                && !candidate.tone.trim().is_empty()
                && !candidate.text.trim().is_empty()
                && !candidate.rationale.trim().is_empty()
        })
        && analysis.warnings.iter().all(|warning| warning.len() <= 300)
}

fn valid_error(error: &ErrorInfo) -> bool {
    !error.code.trim().is_empty() && !error.message.trim().is_empty() && error.message.len() <= 300
}

#[cfg(test)]
mod tests {
    use super::parse_sidecar_event;

    #[test]
    fn accepts_supported_event_for_current_job() {
        let line = br#"{"schema_version":"1.0","event":"job_started","job_id":"job-1","total":1}"#;

        assert!(parse_sidecar_event(line, "job-1").is_ok());
    }

    #[test]
    fn rejects_event_for_another_job() {
        let line = br#"{"schema_version":"1.0","event":"job_finished","job_id":"job-2","succeeded_count":1,"failed_count":0}"#;

        assert!(parse_sidecar_event(line, "job-1").is_err());
    }

    #[test]
    fn accepts_fatal_event_without_job_id() {
        let line = r#"{"schema_version":"1.0","event":"fatal_error","error":{"code":"invalid_input","message":"잘못된 요청","retryable":false}}"#.as_bytes();

        assert!(parse_sidecar_event(line, "job-1").is_ok());
    }

    #[test]
    fn rejects_job_started_event_when_total_is_missing() {
        let line = br#"{"schema_version":"1.0","event":"job_started","job_id":"job-1"}"#;

        assert!(parse_sidecar_event(line, "job-1").is_err());
    }

    #[test]
    fn rejects_succeeded_result_when_analysis_is_missing() {
        let line = br#"{"schema_version":"1.0","event":"review_result","job_id":"job-1","review_id":"review-1","source_index":0,"status":"succeeded","analysis":null,"error":null}"#;

        assert!(parse_sidecar_event(line, "job-1").is_err());
    }

    #[test]
    fn rejects_result_when_source_index_is_outside_request_limit() {
        let line = r#"{"schema_version":"1.0","event":"review_result","job_id":"job-1","review_id":"review-1","source_index":200,"status":"failed","analysis":null,"error":{"code":"timeout","message":"시간 초과","retryable":true}}"#.as_bytes();

        assert!(parse_sidecar_event(line, "job-1").is_err());
    }
}

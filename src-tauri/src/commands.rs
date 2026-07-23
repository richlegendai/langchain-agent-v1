use serde::Serialize;
use std::{
    collections::{hash_map::Entry, HashMap},
    sync::{Mutex, MutexGuard},
};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use crate::contracts::{validate_request, AnalysisRequest};
use crate::events::{parse_sidecar_event, SidecarProtocolError};

const SIDECAR_NAME: &str = "review-analysis-sidecar";
const EVENT_NAME: &str = "review-analysis-event";

#[derive(Debug, Serialize)]
pub struct CommandError {
    code: &'static str,
    message: String,
}

impl CommandError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

impl From<SidecarProtocolError> for CommandError {
    fn from(error: SidecarProtocolError) -> Self {
        Self::new("invalid_sidecar_output", error.to_string())
    }
}

#[derive(Default)]
pub struct JobState {
    jobs: Mutex<HashMap<String, CommandChild>>,
}

impl Drop for JobState {
    fn drop(&mut self) {
        match self.jobs.get_mut() {
            Ok(jobs) => {
                for (_, child) in jobs.drain() {
                    if child.kill().is_err() {
                        eprintln!("실행 중인 분석 프로세스를 종료하지 못했습니다.");
                    }
                }
            }
            Err(_) => eprintln!("종료할 분석 작업 상태를 확인하지 못했습니다."),
        }
    }
}

fn lock_jobs<'state, 'manager>(
    state: &'state State<'manager, JobState>,
) -> Result<MutexGuard<'state, HashMap<String, CommandChild>>, CommandError> {
    state.jobs.lock().map_err(|_| {
        CommandError::new(
            "job_state_failed",
            "실행 중인 분석 작업 상태를 확인하지 못했습니다.",
        )
    })
}

fn emit(app: &AppHandle, payload: serde_json::Value) -> Result<(), CommandError> {
    app.emit(EVENT_NAME, payload).map_err(|_| {
        CommandError::new(
            "event_delivery_failed",
            "분석 결과를 화면으로 전달하지 못했습니다.",
        )
    })
}

#[tauri::command]
pub async fn start_review_analysis(
    app: AppHandle,
    state: State<'_, JobState>,
    request: AnalysisRequest,
) -> Result<(), CommandError> {
    validate_request(&request)
        .map_err(|error| CommandError::new("invalid_request", error.to_string()))?;
    let request_bytes = serde_json::to_vec(&request).map_err(|_| {
        CommandError::new(
            "request_encoding_failed",
            "분석 요청을 준비하지 못했습니다.",
        )
    })?;
    let command = app.shell().sidecar(SIDECAR_NAME).map_err(|_| {
        CommandError::new(
            "sidecar_not_ready",
            "분석 프로세스를 찾을 수 없습니다. sidecar 빌드를 먼저 실행해 주세요.",
        )
    })?;
    let (mut receiver, mut child) = command.spawn().map_err(|_| {
        CommandError::new(
            "sidecar_start_failed",
            "분석 프로세스를 시작하지 못했습니다.",
        )
    })?;
    child.write(&request_bytes).map_err(|_| {
        CommandError::new("sidecar_write_failed", "분석 요청을 전달하지 못했습니다.")
    })?;
    child.write(b"\n").map_err(|_| {
        CommandError::new("sidecar_write_failed", "분석 요청을 완료하지 못했습니다.")
    })?;
    {
        let mut jobs = lock_jobs(&state)?;
        match jobs.entry(request.job_id.clone()) {
            Entry::Vacant(slot) => {
                slot.insert(child);
            }
            Entry::Occupied(_) => {
                drop(jobs);
                child.kill().map_err(|_| {
                    CommandError::new(
                        "sidecar_cleanup_failed",
                        "중복 실행된 분석 프로세스를 종료하지 못했습니다.",
                    )
                })?;
                return Err(CommandError::new(
                    "duplicate_job",
                    "같은 분석 작업이 이미 실행 중입니다.",
                ));
            }
        }
    }

    let mut exit_code = None;
    let mut processing_error = None;
    let mut finished_event_seen = false;
    let mut stderr_seen = false;
    while let Some(event) = receiver.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => match parse_sidecar_event(&bytes, &request.job_id) {
                Ok(value) => {
                    finished_event_seen =
                        value.get("event").and_then(|event| event.as_str()) == Some("job_finished");
                    if let Err(error) = emit(&app, value) {
                        processing_error = Some(error);
                        break;
                    }
                }
                Err(error) => {
                    processing_error = Some(CommandError::from(error));
                    break;
                }
            },
            CommandEvent::Stderr(_) => stderr_seen = true,
            CommandEvent::Error(_) => {
                processing_error = Some(CommandError::new(
                    "sidecar_stream_failed",
                    "분석 프로세스와 통신하지 못했습니다.",
                ));
                break;
            }
            CommandEvent::Terminated(payload) => {
                exit_code = payload.code;
                break;
            }
            _ => {
                processing_error = Some(CommandError::new(
                    "sidecar_stream_failed",
                    "분석 프로세스에서 지원하지 않는 이벤트를 받았습니다.",
                ));
                break;
            }
        }
    }

    let child = lock_jobs(&state)?.remove(&request.job_id);
    if let Some(error) = processing_error {
        if let Some(child) = child {
            child.kill().map_err(|_| {
                CommandError::new(
                    "sidecar_cleanup_failed",
                    "오류가 발생한 분석 프로세스를 종료하지 못했습니다.",
                )
            })?;
        }
        return Err(error);
    }
    if exit_code != Some(0) {
        let message = if stderr_seen {
            "분석 프로세스가 오류를 보고하고 종료되었습니다."
        } else {
            "분석 프로세스가 정상적으로 끝나지 않았습니다."
        };
        return Err(CommandError::new("sidecar_failed", message));
    }
    if !finished_event_seen {
        return Err(CommandError::new(
            "incomplete_sidecar_output",
            "분석 완료 메시지를 받지 못했습니다.",
        ));
    }
    Ok(())
}

#[tauri::command]
pub fn cancel_review_analysis(
    state: State<'_, JobState>,
    job_id: String,
) -> Result<(), CommandError> {
    let child = lock_jobs(&state)?.remove(&job_id);
    let Some(child) = child else {
        return Err(CommandError::new(
            "job_not_found",
            "취소할 분석 작업을 찾을 수 없습니다.",
        ));
    };
    child
        .kill()
        .map_err(|_| CommandError::new("cancel_failed", "분석 작업을 취소하지 못했습니다."))
}

/**
 * Reusable Along API Client (frontend/src/lib/api.ts).
 * Encapsulates all backend HTTP calls with typed interfaces and zero styling.
 */

export interface StageTrace {
  stage: string;
  provider_label: string;
  model_id: string;
  label?: string;
  llm_level?: string;
  latency_ms: number;
  input_truncated?: string;
  output_truncated?: string;
  status: "ok" | "fallback" | "error";
  fallback: boolean;
}

export interface ResolverScores {
  cosine_score: number;
  jaro_winkler_score: number;
  popularity_score: number;
  final_score: number;
}

export interface DemoChatResponse {
  status: string;
  fallback: boolean;
  fallback_banner?: string | null;
  traces?: StageTrace[];
  pane1_whatsapp: {
    phone: string;
    locale: "en" | "pcm" | "ha";
    stage: string;
    reply_text: string;
    buttons: string[];
    request_code?: string | null;
    boarding_otp?: string | null;
    share_token?: string | null;
  };
  pane2_xray_and_ledger: {
    xray: {
      turn: number;
      prev_stage: string;
      next_stage?: string;
      asr?: StageTrace | null;
      guard?: StageTrace | null;
      extraction?: Record<string, unknown> | null;
      resolution?: {
        status: string;
        corridor_id: string;
        direction?: string;
        origin_best?: string | null;
        origin_score?: number;
        origin_scores?: ResolverScores | null;
        destination_best?: string | null;
        destination_score?: number;
        destination_scores?: ResolverScores | null;
        anchor_id?: string | null;
        anchor_name?: string | null;
        active_fare_kobo?: number;
      } | null;
      traces: StageTrace[];
      fallback: boolean;
      fallback_banner?: string | null;
      total_turn_ms?: number;
    };
    fallback: boolean;
    fallback_banner?: string | null;
    corridor_id: string;
    origin_name?: string | null;
    destination_name?: string | null;
    anchor_id?: string | null;
    anchor_name?: string | null;
    unit_fare_naira: string;
    total_fare_naira: string;
    pod_gross_naira: string;
    driver_net_90pct_naira: string;
    platform_10pct_naira: string;
    agbero_fee_saved_naira: string;
    escrow_type: string;
    trial_balance_kobo: number;
  };
  pane3_driver: {
    profile_type: string;
    pod_code: string;
    driver_name: string;
    plate_number: string;
    vehicle_desc: string;
    phone_mode: string;
    ussd_shortcode: string;
    boarding_otp_expected: string;
  };
}

export interface ASRResponse {
  status: string;
  transcript: string;
  detected_language: string;
  model_used: string;
  provider: string;
  label: string;
  latency_ms: number;
  fallback: boolean;
}

export interface PublicTripShareResponse {
  share_token: string;
  pod_code: string;
  corridor_id: string;
  corridor_name: string;
  status: string;
  origin_anchor: string;
  destination_landmark: string;
  driver: {
    full_name: string;
    profile_note: string;
    vehicle_desc: string;
    plate_number: string;
    id_on_file: boolean;
    rating: number;
  };
  telemetry: {
    lat: number;
    lng: number;
    current_landmark: string;
    progress_pct: number;
    eta_minutes: number;
    route_deviation_m: number;
    is_on_corridor: boolean;
  };
  escrow_status: string;
  sos_active: boolean;
  updated_at: string;
}

export interface ReplayRunItem {
  id: string;
  title: string;
  locale: "en" | "pcm" | "ha";
  utterance: string;
  phone: string;
  stage: string;
  reply_text: string;
  request_code?: string | null;
  boarding_otp?: string | null;
  share_token?: string | null;
  fallback: boolean;
  fallback_banner?: string | null;
  traces: StageTrace[];
  quote: {
    corridor_id: string;
    origin_name?: string | null;
    dest_name?: string | null;
    anchor_id?: string | null;
    anchor_name?: string | null;
    seats: number;
    unit_fare: string;
    total_fare: string;
    otp: string;
    pod_gross?: string;
    driver_net?: string;
    platform_fee?: string;
  };
  driver: {
    pod_code: string;
    driver_name: string;
    plate_number: string;
    vehicle_desc: string;
  };
  xray: Record<string, unknown>;
}

export interface LiveReplayDoc {
  recorded_at: string;
  label: string;
  total_runs: number;
  runs: ReplayRunItem[];
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

const API_BASE_URL = getApiBaseUrl();

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Server responded with HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      detail = errJson.detail || errJson.title || errJson.message || detail;
    } catch {
      // Body not json
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export async function sendDemoChat(input: {
  phone?: string;
  message_text?: string | null;
  audio_fixture_id?: string | null;
  is_peak?: boolean;
}): Promise<DemoChatResponse> {
  const url = `${getApiBaseUrl()}/api/v1/demo/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: input.phone || "+2348031234567",
      message_text: input.message_text ?? null,
      audio_fixture_id: input.audio_fixture_id ?? null,
      is_peak: input.is_peak ?? false,
    }),
  });
  return parseJsonResponse<DemoChatResponse>(res);
}

export async function transcribeAudio(
  audioBlob: Blob | File,
  filename = "voice_note.ogg"
): Promise<ASRResponse> {
  const url = `${getApiBaseUrl()}/api/v1/demo/asr`;
  const formData = new FormData();
  formData.append("file", audioBlob, filename);

  const res = await fetch(url, {
    method: "POST",
    body: formData,
  });
  return parseJsonResponse<ASRResponse>(res);
}

export async function getPublicTripShare(shareToken: string): Promise<PublicTripShareResponse> {
  const url = `${getApiBaseUrl()}/api/v1/trips/share/${encodeURIComponent(shareToken)}`;
  const res = await fetch(url);
  return parseJsonResponse<PublicTripShareResponse>(res);
}

export async function triggerPublicTripSos(shareToken: string): Promise<{
  status: string;
  share_token: string;
  pod_code: string;
  driver_plate: string;
  message: string;
}> {
  const url = `${getApiBaseUrl()}/api/v1/trips/share/${encodeURIComponent(shareToken)}/sos`;
  const res = await fetch(url, { method: "POST" });
  return parseJsonResponse(res);
}

export async function getCorridorDrivers(): Promise<{
  count: number;
  drivers: Array<{
    id: string;
    full_name: string;
    phone_e164: string;
    phone_mode: string;
    corridor_id: string;
    vehicle_make_model: string;
    vehicle_color: string;
    plate_number: string;
    seat_capacity: number;
    status: string;
  }>;
}> {
  const url = `${getApiBaseUrl()}/api/v1/drivers`;
  const res = await fetch(url);
  return parseJsonResponse(res);
}

export async function updateDriverStatus(
  driverId: string,
  status: "ONLINE" | "OFFLINE",
  details?: { corridor_id?: string; anchor_id?: string; direction?: string }
): Promise<{ status: string; driver: Record<string, unknown> }> {
  const url = `${getApiBaseUrl()}/api/v1/drivers/${encodeURIComponent(driverId)}/status`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status,
      corridor_id: details?.corridor_id || "BWR-DUT-WUS",
      direction: details?.direction || "S",
      anchor_id: details?.anchor_id || "ANC-DUT-01",
      lat: 9.1779,
      lng: 7.3736,
      phone_mode: "SMARTPHONE",
    }),
  });
  return parseJsonResponse(res);
}

export async function verifyBoardingOtp(
  driverId: string,
  podId: string,
  otpCode: string,
  rideRequestId = "rr-demo-01",
  driverLat = 9.1779,
  driverLng = 7.3736
): Promise<{
  status: string;
  pod_id: string;
  boarded_count: number;
  driver_id?: string;
  ride_request_id?: string;
  escrow_state?: string;
  pod_status?: string;
}> {
  const url = `${getApiBaseUrl()}/api/v1/drivers/${encodeURIComponent(driverId)}/pods/${encodeURIComponent(podId)}/verify-otp`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ride_request_id: rideRequestId,
      otp_code: otpCode,
      driver_lat: driverLat,
      driver_lng: driverLng,
    }),
  });
  return parseJsonResponse(res);
}

export async function getOpsOverview(): Promise<{
  brand: string;
  city: string;
  network: {
    active_corridors: number;
    fare_zones: number;
    private_filling_station_anchors: number;
    indexed_landmarks: number;
    seeded_drivers: number;
    live_online_drivers: number;
  };
  ledger_audit: {
    trial_balance_kobo: number;
    is_balanced: boolean;
    agbero_extortion_avoided_naira: string;
  };
  active_sos_count: number;
  sos_alerts: Array<Record<string, unknown>>;
}> {
  const url = `${getApiBaseUrl()}/api/v1/ops/overview`;
  const res = await fetch(url);
  return parseJsonResponse(res);
}

export async function getLiveReplayFile(): Promise<{
  available: boolean;
  recorded_at: string | null;
  replay: LiveReplayDoc | null;
}> {
  try {
    const backendRes = await fetch(`${getApiBaseUrl()}/api/v1/demo/replay/live`);
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.available && data.replay) {
        return {
          available: true,
          recorded_at: data.recorded_at,
          replay: data.replay,
        };
      }
    }
  } catch {
    // Try static public file fallback
  }

  try {
    const staticRes = await fetch("/real_replay.json");
    if (staticRes.ok) {
      const data = (await staticRes.json()) as LiveReplayDoc;
      if (data && data.recorded_at && Array.isArray(data.runs)) {
        return {
          available: true,
          recorded_at: data.recorded_at,
          replay: data,
        };
      }
    }
  } catch {
    // File not found
  }

  return {
    available: false,
    recorded_at: null,
    replay: null,
  };
}

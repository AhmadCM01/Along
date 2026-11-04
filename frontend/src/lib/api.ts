/**
 * Reusable Along API Client (frontend/src/lib/api.ts).
 * Encapsulates all backend HTTP calls with typed interfaces and zero styling.
 */

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

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
    seats?: number;
    request_code?: string | null;
    boarding_otp?: string | null;
    share_token?: string | null;
    share_url?: string | null;
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
    seats?: number;
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
  stage: "WAITING_FOR_DRIVER" | "DRIVER_ON_THE_WAY" | "BOARDING" | "IN_TRANSIT" | "COMPLETED" | string;
  stage_label: string;
  progress: number;
  position: { lat: number; lon: number };
  previous_waypoint: string;
  next_waypoint: string;
  eta_seconds: number;
  pickup: string;
  drop: string;
  seats: number;
  boarded_count: number;
  pod_seats_total: number;
  driver: {
    full_name: string;
    profile_note: string;
    vehicle_desc: string;
    plate_number: string;
    id_on_file: boolean;
    rating: number;
  };
  plate: string;
  escrow_status: string;
  sos_active: boolean;
  server_time: number;
  departed_at: number | null;
  // Legacy fields for backward compatibility
  share_token?: string;
  pod_code?: string;
  corridor_id?: string;
  corridor_name?: string;
  status?: string;
  telemetry?: {
    lat: number;
    lng: number;
    current_landmark: string;
    progress_pct: number;
    eta_minutes: number;
    route_deviation_m: number;
    is_on_corridor: boolean;
  };
  fare_naira?: number;
  updated_at?: string;
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

const SESSION_STORAGE_KEY = "along_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "session-node-ssr-default-01";
  }
  let id = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = "session-" + Math.random().toString(36).substring(2, 12) + "-" + Date.now().toString(36);
    }
    localStorage.setItem(SESSION_STORAGE_KEY, id);
  }
  return id;
}

function getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const sessionId = getOrCreateSessionId();
  return {
    "X-Along-Session": sessionId,
    ...(customHeaders || {}),
  };
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export interface HealthStatus {
  status: "ok" | "waking_up" | "error";
  message?: string;
  version?: string;
}

export async function pingBackendHealth(): Promise<HealthStatus> {
  const url = `${getApiBaseUrl()}/healthz`;
  if (typeof window === "undefined") {
    return { status: "ok" };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: getHeaders(),
    });
    clearTimeout(timer);
    if (res.status === 503) {
      return { status: "waking_up", message: "Server is waking up (free tier cold start)..." };
    }
    if (res.ok) {
      const data = await res.json();
      return { status: "ok", version: data.version };
    }
    return { status: "error", message: "The live AI server is not answering." };
  } catch {
    clearTimeout(timer);
    return { status: "error", message: "The live AI server is not answering." };
  }
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Server responded with HTTP ${res.status}`;
    let code: string | undefined = undefined;
    try {
      const errJson = await res.json();
      detail = errJson.message || errJson.detail || errJson.title || detail;
      code = errJson.code;
    } catch {
      // Body not json
    }
    throw new ApiError(detail, res.status, code);
  }
  return (await res.json()) as T;
}

export async function sendDemoChat(input: {
  phone?: string;
  message_text?: string | null;
  audio_fixture_id?: string | null;
  is_peak?: boolean;
  reset_session?: boolean;
}): Promise<DemoChatResponse> {
  const url = `${getApiBaseUrl()}/api/v1/demo/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      phone: input.phone || "+2348031234567",
      message_text: input.message_text ?? null,
      audio_fixture_id: input.audio_fixture_id ?? null,
      is_peak: input.is_peak ?? false,
      reset_session: input.reset_session ?? false,
    }),
  });
  return parseJsonResponse<DemoChatResponse>(res);
}

export async function transcribeAudio(
  audioBlob: Blob | File,
  filename = "voice_note.webm",
  clientTranscript?: string,
  localeHint?: string
): Promise<ASRResponse> {
  const url = `${getApiBaseUrl()}/api/v1/demo/asr`;
  const formData = new FormData();
  formData.append("file", audioBlob, filename);
  if (clientTranscript && clientTranscript.trim()) {
    formData.append("client_transcript", clientTranscript.trim());
  }
  if (localeHint && localeHint.trim()) {
    formData.append("locale_hint", localeHint.trim());
  }

  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: formData,
  });
  return parseJsonResponse<ASRResponse>(res);
}

export async function getPublicTripShare(shareToken: string): Promise<PublicTripShareResponse> {
  const url = `${getApiBaseUrl()}/api/v1/trips/share/${encodeURIComponent(shareToken)}`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  return parseJsonResponse<PublicTripShareResponse>(res);
}

export async function triggerPublicTripSos(shareToken: string): Promise<{
  status: string;
  share_token: string;
  pod_code: string;
  driver_plate: string;
  message: string;
  text?: string;
  sos_active?: boolean;
}> {
  const url = `${getApiBaseUrl()}/api/v1/trips/share/${encodeURIComponent(shareToken)}/sos`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
  });
  return parseJsonResponse(res);
}

export async function updateDriverPodLocation(
  driverId: string,
  podId: string,
  data: {
    lat: number;
    lng: number;
    progress_pct: number;
    current_landmark?: string;
    status?: string;
    eta_minutes?: number;
  }
): Promise<{ status: string; pod_status: string }> {
  const url = `${getApiBaseUrl()}/api/v1/drivers/${encodeURIComponent(driverId)}/pods/${encodeURIComponent(podId)}/location`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res);
}

export async function updateTripLocation(
  shareToken: string,
  data: {
    lat: number;
    lng: number;
    progress_pct: number;
    current_landmark?: string;
    status?: string;
    eta_minutes?: number;
  }
): Promise<{ status: string; trip_status: string }> {
  const url = `${getApiBaseUrl()}/api/v1/trips/share/${encodeURIComponent(shareToken)}/location`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(data),
  });
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
  const res = await fetch(url, {
    headers: getHeaders(),
  });
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
    headers: getHeaders({ "Content-Type": "application/json" }),
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
  rideRequestId = "auto",
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
  message?: string;
}> {
  const url = `${getApiBaseUrl()}/api/v1/drivers/${encodeURIComponent(driverId)}/pods/${encodeURIComponent(podId)}/verify-otp`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      ride_request_id: rideRequestId,
      otp_code: otpCode,
      driver_lat: driverLat,
      driver_lng: driverLng,
    }),
  });
  return parseJsonResponse(res);
}

export interface ActivePodPassenger {
  request_id: string;
  first_name?: string;
  phone?: string;
  display_name: string;
  simulated?: boolean;
  origin: string;
  destination: string;
  seats: number;
  seat_numbers: number[];
  fare_naira: number;
  otp_code: string;
  is_boarded: boolean;
  is_alighted?: boolean;
  is_confirmed?: boolean;
  status: string;
}

export interface ActivePodData {
  pod_id: string;
  corridor_id: string;
  driver_id: string;
  driver_name: string;
  driver_phone?: string;
  plate_number: string;
  vehicle_desc: string;
  anchor_name?: string;
  anchor_lat?: number;
  anchor_lng?: number;
  seats_total?: number;
  seats_occupied: number;
  passengers: ActivePodPassenger[];
  status: string;
  stage?: string;
  stage_label?: string;
  progress?: number;
  departed_at?: number | null;
  boarded_requests?: string[];
}

export async function getActivePod(
  corridorId = "BWR-DUT-WUS",
  podId?: string
): Promise<{
  status: string;
  pod: ActivePodData;
}> {
  const params = new URLSearchParams({ corridor_id: corridorId });
  if (podId) params.set("pod_id", podId);
  const url = `${getApiBaseUrl()}/api/v1/drivers/active-pod?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });
  return parseJsonResponse(res);
}

export async function resetActivePod(
  corridorId = "BWR-DUT-WUS",
  podId?: string
): Promise<{
  status: string;
  message: string;
  pod_id: string;
}> {
  const params = new URLSearchParams({ corridor_id: corridorId });
  if (podId) params.set("pod_id", podId);
  const url = `${getApiBaseUrl()}/api/v1/drivers/active-pod/reset?${params.toString()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
  });
  return parseJsonResponse(res);
}

export async function dispatchPodEarly(
  driverId = "DRV-001",
  podId = "active"
): Promise<{
  status: string;
  pod_id: string;
  departed_at?: number;
  message: string;
}> {
  const url = `${getApiBaseUrl()}/api/v1/drivers/${encodeURIComponent(driverId)}/pods/${encodeURIComponent(podId)}/dispatch`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
  });
  return parseJsonResponse(res);
}

export async function fillPodCoRiders(
  driverId = "DRV-001",
  podId = "active"
): Promise<{
  status: string;
  pod_id: string;
  added_count: number;
  seats_occupied: number;
  pod_status: string;
}> {
  const url = `${getApiBaseUrl()}/api/v1/drivers/${encodeURIComponent(driverId)}/pods/${encodeURIComponent(podId)}/fill-coriders`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
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
    indexed_vectors?: number;
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
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  return parseJsonResponse(res);
}

export async function getLiveReplayFile(): Promise<{
  available: boolean;
  recorded_at: string | null;
  replay: LiveReplayDoc | null;
  isOfflineSample?: boolean;
}> {
  try {
    const backendRes = await fetch(`${getApiBaseUrl()}/api/v1/demo/replay/live`, {
      headers: getHeaders(),
    });
    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data.available && data.replay) {
        return {
          available: true,
          recorded_at: data.recorded_at,
          replay: data.replay,
          isOfflineSample: false,
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
          isOfflineSample: true,
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
    isOfflineSample: false,
  };
}

// VaaS (developers.vaas.live) due-diligence workflow client.
//
// Auth: confirmed — every request needs
//   Authorization: Basic base64(apiTokenId:apiTokenSecret)
//
// Endpoint path/request-response shape: NOT yet confirmed against the real
// docs (the api-reference page blocks non-browser fetches). The path below
// is a best-effort guess reconstructed from indexed fragments of VaaS's own
// docs ("execute a workflow", async, poll by execution id, request body
// shaped by the workflow's own configured entrypoint). Expect to correct
// EXECUTE_PATH_TEMPLATE once the real docs are pasted in — everything else
// (env var names, auth header, error surfacing) should not need to change.
const EXECUTE_PATH_TEMPLATE = (workflowId: string) => `/v1/workflows/${workflowId}/execute`;

export type VaasCheckResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; error: "not_configured" | "request_failed"; message: string; status?: number; body?: unknown };

// Runs the configured workflow against a single CNPJ. entrypointField lets
// the caller match whatever field name the workflow's entrypoint actually
// expects (unconfirmed — defaults to "cnpj").
export async function checkCnpjWithVaas(
  cnpj: string,
  entrypointField: string = "cnpj"
): Promise<VaasCheckResult> {
  const baseUrl = process.env.VAAS_API_BASE_URL;
  const tokenId = process.env.VAAS_API_TOKEN_ID;
  const tokenSecret = process.env.VAAS_API_TOKEN_SECRET;
  const workflowId = process.env.VAAS_WORKFLOW_ID;

  if (!baseUrl || !tokenId || !tokenSecret || !workflowId) {
    return {
      ok: false,
      error: "not_configured",
      message:
        "Faltam variáveis de ambiente da VaaS (VAAS_API_BASE_URL, VAAS_API_TOKEN_ID, VAAS_API_TOKEN_SECRET, VAAS_WORKFLOW_ID).",
    };
  }

  const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");
  const url = `${baseUrl.replace(/\/$/, "")}${EXECUTE_PATH_TEMPLATE(workflowId)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entrypoint: { [entrypointField]: cnpj } }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: "request_failed",
        message: `VaaS respondeu ${res.status}.`,
        status: res.status,
        body,
      };
    }

    return { ok: true, status: res.status, data: body };
  } catch (err) {
    return {
      ok: false,
      error: "request_failed",
      message: err instanceof Error ? err.message : "Falha de rede ao chamar a VaaS.",
    };
  }
}

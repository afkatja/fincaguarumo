/**
 * @deprecated Import from `@/lib/model-gateway` or `@/lib/degradation-response`.
 *
 * Re-exports for backward compatibility. All model routing lives in model-gateway.
 */

export type {
  DegradationType,
  DegradationResponse,
} from "./degradation-response"

export {
  classifyDegradationType,
  createDegradationResponse,
  isDegradationResponse,
  cacheEvaluationData,
  getCachedEvaluationData,
  clearEvaluationCache,
} from "./degradation-response"

export {
  execute,
  resolveModel,
  getAvailableModels,
  validateModelEnvironment,
  testModelConnectivity,
  testModelConnectivityWithCircuitBreaker,
  getModelRecommendation,
  type GatewayRequest,
  type GatewayResponse,
  type GatewayResult,
} from "./model-gateway"

import axios, {
  AxiosHeaderValue,
  AxiosInstance,
  CreateAxiosDefaults,
  isAxiosError,
  RawAxiosRequestHeaders,
  RawAxiosResponseHeaders,
} from "axios";
import { isObject } from "./object";

// Redact sensitive headers and body fields from the logs
const MASK = "██";
const HEADERS_TO_REDACT = ["authorization", "cookie", "x-api-key"];
const FIELDS_TO_REDACT = ["password", "refresh_token"];

export const redactHeadersAndFields = (
  headers?: RawAxiosRequestHeaders | RawAxiosResponseHeaders,
  data?: unknown
): {
  headersForLogging: typeof headers;
  dataForLogging: typeof data;
} => {
  let headersForLogging;
  let dataForLogging;

  if (isObject(headers)) {
    const headersObj = headers as Record<string, AxiosHeaderValue | undefined>;
    headersForLogging = { ...headersObj };

    for (const header of HEADERS_TO_REDACT) {
      if (Object.hasOwn(headersObj, header)) {
        headersForLogging[header] = MASK;
      }
    }
  } else {
    headersForLogging = headers;
  }

  if (isObject(data)) {
    const dataObj = data as Record<string, unknown>;
    dataForLogging = { ...dataObj };

    for (const field of FIELDS_TO_REDACT) {
      if (Object.hasOwn(dataObj, field)) {
        dataForLogging[field] = MASK;
      }
    }
  } else {
    dataForLogging = data;
  }

  return { headersForLogging, dataForLogging };
};

/**
 * Initialize Axios with interceptors
 * @param config the API configuration
 * @returns a new Axios instance
 */
const createAxios = (config: CreateAxiosDefaults): AxiosInstance => {
  const axiosInstance = axios.create(config);

  axiosInstance.interceptors.request.use(
    (config) => {
      // Log fulfilled requests
      const { method, baseURL, url, headers, data } = config;
      const fullUrl = (baseURL ?? "") + (url ?? "") || undefined;
      const { headersForLogging, dataForLogging } = redactHeadersAndFields(
        headers,
        data
      );

      let log =
        `[Axios Request] ${new Date()} | Method: ${method?.toUpperCase()} | URL: ${fullUrl} | ` +
        `Headers: ${JSON.stringify(headersForLogging)}`;
      // Don't log empty request bodies
      if (dataForLogging !== undefined) {
        log += ` | Data: ${JSON.stringify(dataForLogging)}`;
      }

      console.log(log);
      return config;
    },
    (error) => {
      // Log rejected requests
      console.error(
        "[Axios Request] Error:",
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    (response) => {
      // Log fulfilled responses
      const { method, baseURL, url } = response.config;
      const { status } = response;
      const fullUrl = (baseURL ?? "") + (url ?? "") || undefined;

      // Don't log response bodies since they can be large and shouldn't contain any surprises
      console.log(
        `[Axios Response] ${new Date()} | Method: ${method?.toUpperCase()} | URL: ${fullUrl} | ` +
          `Status: ${status}`
      );
      return response;
    },
    (error) => {
      // Log rejected errors
      if (isAxiosError(error)) {
        const { code, message, config, response } = error;
        const { method, baseURL, url } = config ?? {};
        const { status, statusText, data } = response ?? {};
        const fullUrl = (baseURL ?? "") + (url ?? "") || undefined;

        console.log(
          `[Axios Response] Error ${new Date()} | Method: ${method?.toUpperCase()} | ` +
            `URL: ${fullUrl} | Status: ${status} | Status Text: ${statusText} | Code: ${code} | ` +
            `Message: ${message} | Data: ${JSON.stringify(data)}`
        );
      } else {
        console.error(
          "[Axios Response] Error:",
          JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        );
      }

      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

export default createAxios;

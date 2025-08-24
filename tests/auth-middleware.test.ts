import { Request, Response } from "express";
import { AuthClientErrorCode } from "firebase-admin/auth";
import * as jwt from "jwt-decode";

import auth from "../middleware/auth";
import FirebaseAdmin from "../utils/auth/admin";
import { COOKIES } from "../utils/cookie";

const mockRequest = (authorization?: string, req?: object) =>
  ({
    originalUrl: "/",
    ...req,
    headers: {
      authorization,
    },
  } as Request);

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockCookie = jest.fn();
const mockClearCookie = jest.fn();
const mockResponse = {
  status: mockStatus,
  json: mockJson,
  locals: {},
  cookie: mockCookie,
  clearCookie: mockClearCookie,
} as unknown as Response;

const mockNext = jest.fn();

const mockValidateToken = (
  isSuccess: boolean,
  isExpired = false,
  isInvalidKid = false
) => {
  jest.spyOn(FirebaseAdmin, "instance", "get").mockReturnValue({
    validateToken: isSuccess
      ? jest.fn().mockResolvedValue("mock-uid")
      : jest.fn().mockRejectedValue(
          isExpired
            ? {
                ...AuthClientErrorCode.ID_TOKEN_EXPIRED,
                code: `auth/${AuthClientErrorCode.ID_TOKEN_EXPIRED.code}`,
              }
            : isInvalidKid
            ? {
                code: `auth/${AuthClientErrorCode.INVALID_ARGUMENT.code}`,
                message:
                  'Firebase ID token has "kid" claim which does not correspond to a known ' +
                  "public key. Most likely the ID token is expired, so get a fresh token from " +
                  "your client app and try again.",
              }
            : "mock error"
        ),
  } as unknown as FirebaseAdmin);
};

describe("auth-middleware", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockResponse.locals = {};
  });

  it("accepts a valid JWT", async () => {
    mockValidateToken(true);
    await auth(mockRequest("mock-valid-jwt"), mockResponse, mockNext);

    expect(mockCookie).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).toBeDefined();
    expect(mockResponse.locals.token).toBeDefined();
  });

  it("accepts a valid cookie", async () => {
    mockValidateToken(true);
    await auth(
      mockRequest(undefined, {
        cookies: {
          [COOKIES.ID_TOKEN]: "mock-valid-jwt",
        },
      }),
      mockResponse,
      mockNext
    );

    expect(mockCookie).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).toBeDefined();
    expect(mockResponse.locals.token).toBeDefined();
  });

  it("skips validation if changing passwords", async () => {
    mockValidateToken(true);
    await auth(
      mockRequest(undefined, {
        originalUrl: "/api/chefs",
        method: "PATCH",
        body: { type: "password", email: "test@email.com" },
      }),
      mockResponse,
      mockNext
    );

    expect(mockCookie).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).not.toBeDefined();
    expect(mockResponse.locals.token).not.toBeDefined();
  });

  it("skips validation if viewing a recipe", async () => {
    mockValidateToken(true);
    await auth(
      mockRequest(undefined, {
        originalUrl: "/api/recipes/:id",
        params: { id: 0 },
        method: "PATCH",
        body: { view: true },
      }),
      mockResponse,
      mockNext
    );

    expect(mockCookie).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).not.toBeDefined();
    expect(mockResponse.locals.token).not.toBeDefined();
  });

  it("rejects a missing token", async () => {
    mockValidateToken(true);
    await auth(mockRequest(), mockResponse, mockNext);

    expect(mockCookie).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("rejects an invalid token", async () => {
    mockValidateToken(false);
    await auth(mockRequest("mock-invalid-jwt"), mockResponse, mockNext);

    expect(mockCookie).not.toHaveBeenCalled();
    expect(mockClearCookie).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("tries to refresh an expired token", async () => {
    const jwtDecodeSpy = jest.spyOn(jwt, "jwtDecode");
    const mockToken = "e30.e30.e30"; // e30 === {}

    mockValidateToken(false, true);
    await auth(mockRequest(mockToken), mockResponse, mockNext);

    expect(jwtDecodeSpy).toHaveBeenCalledWith(mockToken);
    expect(mockCookie).not.toHaveBeenCalled();
    expect(mockClearCookie).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("tries to refresh a token with an invalid kid", async () => {
    const jwtDecodeSpy = jest.spyOn(jwt, "jwtDecode");
    const mockToken = "e30.e30.e30";

    mockValidateToken(false, false, true);
    await auth(mockRequest(mockToken), mockResponse, mockNext);

    expect(jwtDecodeSpy).toHaveBeenCalledWith(mockToken);
    expect(mockCookie).not.toHaveBeenCalled();
    expect(mockClearCookie).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalled();
  });
});

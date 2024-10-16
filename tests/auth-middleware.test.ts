import { Request, Response } from "express";
import * as jwt from "jwt-decode";

import auth from "../middleware/auth";
import FirebaseAdmin from "../utils/auth/admin";

const mockRequest = (authorization?: string, req?: object) =>
  ({
    ...req,
    headers: {
      authorization,
    },
  } as Request);
const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockResponse = {
  status: mockStatus,
  json: mockJson,
  locals: {},
} as unknown as Response;
const mockNext = jest.fn();

const mockValidateToken = (isSuccess: boolean, isExpired = false) => {
  jest.spyOn(FirebaseAdmin, "instance", "get").mockReturnValue({
    validateToken: isSuccess
      ? jest.fn().mockResolvedValue("mock-uid")
      : jest
          .fn()
          .mockRejectedValue(
            isExpired ? { code: "auth/id-token-expired" } : "mock error"
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

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).toBeDefined();
    expect(mockResponse.locals.token).toBeDefined();
  });

  it("skips validation if changing passwords", async () => {
    mockValidateToken(true);
    await auth(
      mockRequest(undefined, {
        url: "/",
        method: "PATCH",
        body: { type: "password", email: "test@email.com" },
      }),
      mockResponse,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).not.toBeDefined();
    expect(mockResponse.locals.token).not.toBeDefined();
  });

  it("skips validation if viewing a recipe", async () => {
    mockValidateToken(true);
    await auth(
      mockRequest(undefined, {
        url: "/:id",
        method: "PATCH",
        body: { view: true },
      }),
      mockResponse,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).not.toBeDefined();
    expect(mockResponse.locals.token).not.toBeDefined();
  });

  it("rejects a missing token", async () => {
    mockValidateToken(true);
    await auth(mockRequest(), mockResponse, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalled();
  });

  it("rejects an invalid token", async () => {
    mockValidateToken(false);
    await auth(mockRequest("mock-invalid-jwt"), mockResponse, mockNext);

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
    expect(mockNext).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalled();
  });
});

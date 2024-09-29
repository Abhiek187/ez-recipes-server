import { Request, Response } from "express";

import auth from "../middleware/auth";
import FirebaseAdmin from "../utils/auth/admin";

const mockRequest = (authorization?: string) =>
  ({
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

const mockValidateToken = (isSuccess: boolean) => {
  jest.spyOn(FirebaseAdmin, "instance", "get").mockReturnValue({
    validateToken: isSuccess
      ? jest.fn().mockResolvedValue("mock-uid")
      : jest.fn().mockRejectedValue("mock error"),
  } as unknown as FirebaseAdmin);
};

describe("auth-middleware", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("accepts a valid JWT", async () => {
    mockValidateToken(true);
    await auth(mockRequest("mock-valid-jwt"), mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.locals.uid).toBeDefined();
    expect(mockResponse.locals.token).toBeDefined();
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
});

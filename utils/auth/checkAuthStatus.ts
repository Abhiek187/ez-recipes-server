import { Request, Response } from "express";

const checkAuthStatus = (req: Request, res: Response) => {
  const userAgent = req.headers["user-agent"] as string | undefined;
  const denylist: string[] = JSON.parse(process.env.DENYLIST ?? "[]");

  for (const agent of denylist) {
    if (userAgent?.includes(agent) === true) {
      console.warn("Request denied due to user agent:", agent);
      res.status(403).json({ error: "Unauthorized" });
      return;
    }
  }
};

export default checkAuthStatus;

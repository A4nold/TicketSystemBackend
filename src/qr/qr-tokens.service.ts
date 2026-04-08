import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

type SignedQrPayload = {
  sub: string;
  qrTokenId: string;
  ownershipRevision: number;
  serialNumber: string;
  eventId: string;
  eventSlug: string;
};

@Injectable()
export class QrTokensService {
  constructor(private readonly jwtService: JwtService) {}

  signTicketToken(payload: SignedQrPayload) {
    const secret = this.getSecret();
    const expiresIn = process.env.QR_TOKEN_EXPIRES_IN ?? "15m";
    const signedToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: expiresIn as never,
    });
    const decoded = this.jwtService.decode(signedToken) as
      | { exp?: number }
      | null;

    return {
      signedToken,
      expiresAt: decoded?.exp ? new Date(decoded.exp * 1000) : null,
    };
  }

  verifyTicketToken(token: string) {
    try {
      return this.jwtService.verify<SignedQrPayload>(token, {
        secret: this.getSecret(),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired QR token.");
    }
  }

  private getSecret() {
    const secret = process.env.QR_TOKEN_SECRET ?? process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("QR_TOKEN_SECRET or JWT_SECRET must be configured.");
    }

    return secret;
  }
}

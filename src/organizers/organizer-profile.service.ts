import {
  ForbiddenException,
  Injectable,
} from "@nestjs/common";

import { AuthenticatedUser } from "../auth/types/authenticated-user.type";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertOrganizerProfileDto } from "./dto/upsert-organizer-profile.dto";

const ORGANIZER_ONBOARDING_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  PROFILE_INCOMPLETE: "PROFILE_INCOMPLETE",
  PROFILE_COMPLETED: "PROFILE_COMPLETED",
  PAYMENT_SETUP_PENDING: "PAYMENT_SETUP_PENDING",
  READY_FOR_PAID_EVENTS: "READY_FOR_PAID_EVENTS",
} as const;

type OrganizerOnboardingStatusValue =
  (typeof ORGANIZER_ONBOARDING_STATUS)[keyof typeof ORGANIZER_ONBOARDING_STATUS];

@Injectable()
export class OrganizerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(user: AuthenticatedUser) {
    this.assertOrganizer(user);

    const profile = await this.ensureProfile(user.id, {
      displayName:
        [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() ||
        null,
    });

    return this.reconcileOnboardingStatus(profile);
  }

  async upsertProfile(user: AuthenticatedUser, payload: UpsertOrganizerProfileDto) {
    this.assertOrganizer(user);

    const existingProfile = await this.ensureProfile(user.id, {
      displayName:
        [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ").trim() ||
        null,
    });

    const nextProfile = {
      businessName:
        payload.businessName !== undefined
          ? payload.businessName.trim() || null
          : existingProfile.businessName,
      country:
        payload.country !== undefined
          ? payload.country.trim().toUpperCase() || null
          : existingProfile.country,
      defaultPayoutCurrency:
        payload.defaultPayoutCurrency !== undefined
          ? payload.defaultPayoutCurrency.trim().toUpperCase() || null
          : existingProfile.defaultPayoutCurrency,
      displayName:
        payload.displayName !== undefined
          ? payload.displayName.trim() || null
          : existingProfile.displayName,
    };

    const profile = await this.prisma.organizerProfile.update({
      where: { id: existingProfile.id },
      data: {
        ...nextProfile,
        onboardingStatus: this.resolveBaseProfileStatus(nextProfile),
      },
    });

    return this.reconcileOnboardingStatus(profile);
  }

  async ensureProfileForUser(userId: string, seed?: { displayName?: string | null }) {
    return this.ensureProfile(userId, seed);
  }

  private async ensureProfile(
    userId: string,
    seed?: { displayName?: string | null },
  ) {
    const existingProfile = await this.prisma.organizerProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return existingProfile;
    }

    return this.prisma.organizerProfile.create({
      data: {
        userId,
        displayName: seed?.displayName ?? null,
        onboardingStatus: seed?.displayName
          ? ORGANIZER_ONBOARDING_STATUS.PROFILE_INCOMPLETE
          : ORGANIZER_ONBOARDING_STATUS.NOT_STARTED,
      },
    });
  }

  private resolveBaseProfileStatus(input: {
    businessName: string | null;
    country: string | null;
    defaultPayoutCurrency: string | null;
    displayName: string | null;
  }) {
    if (
      input.displayName &&
      input.country &&
      input.defaultPayoutCurrency
    ) {
      return ORGANIZER_ONBOARDING_STATUS.PROFILE_COMPLETED;
    }

    if (
      input.displayName ||
      input.businessName ||
      input.country ||
      input.defaultPayoutCurrency
    ) {
      return ORGANIZER_ONBOARDING_STATUS.PROFILE_INCOMPLETE;
    }

    return ORGANIZER_ONBOARDING_STATUS.NOT_STARTED;
  }

  private async reconcileOnboardingStatus(profile: {
    id: string;
    userId: string;
    displayName: string | null;
    businessName: string | null;
    country: string | null;
    defaultPayoutCurrency: string | null;
    onboardingStatus: string;
    providerSelectedAt?: Date | null;
    providerSelectionSource?: string | null;
    recommendedProvider?: string | null;
    selectedPaymentProvider?: string | null;
  }) {
    const baseProfileStatus = this.resolveBaseProfileStatus({
      businessName: profile.businessName,
      country: profile.country,
      defaultPayoutCurrency: profile.defaultPayoutCurrency,
      displayName: profile.displayName,
    });

    let nextStatus: OrganizerOnboardingStatusValue = baseProfileStatus;

    if (baseProfileStatus === ORGANIZER_ONBOARDING_STATUS.PROFILE_COMPLETED) {
      const paymentProfile = await this.prisma.organizerPaymentProfile.findUnique({
        where: { organizerId: profile.userId },
        select: { isReadyForPaidEvents: true },
      });

      nextStatus = paymentProfile?.isReadyForPaidEvents
        ? ORGANIZER_ONBOARDING_STATUS.READY_FOR_PAID_EVENTS
        : ORGANIZER_ONBOARDING_STATUS.PAYMENT_SETUP_PENDING;
    }

    if (profile.onboardingStatus === nextStatus) {
      return profile;
    }

    return this.prisma.organizerProfile.update({
      where: { id: profile.id },
      data: {
        onboardingStatus: nextStatus,
      },
    });
  }

  private assertOrganizer(user: AuthenticatedUser) {
    if (user.accountType !== "ORGANIZER") {
      throw new ForbiddenException("Only organizer accounts can access organizer profile setup.");
    }
  }
}

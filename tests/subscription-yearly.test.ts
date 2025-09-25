/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Mock the database module with complete Drizzle ORM chain ----
vi.mock('@/database/index', () => {
  // Create a mock that supports the full Drizzle query chain
  const createMockQuery = () => {
    const mockQuery = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      set: vi.fn(),
      returning: vi.fn(),
    };
    
    // Make all methods return the mockQuery for chaining
    mockQuery.from.mockReturnValue(mockQuery);
    mockQuery.where.mockReturnValue(mockQuery);
    mockQuery.orderBy.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);
    mockQuery.set.mockReturnValue(mockQuery);
    mockQuery.returning.mockReturnValue(mockQuery);
    
    return mockQuery;
  };

  const mockDb = {
    select: vi.fn(() => createMockQuery()),
    update: vi.fn(() => createMockQuery()),
  };

  return {
    db: mockDb,
    userSubscriptions: {},
    userUsageQuotas: {},
  };
});

// Import after mocking
import { db } from '@/database/index';
import { SubscriptionManager } from "@/server/services/subscriptions/subscriptionManager";

const service = new SubscriptionManager();

//
// ----------------------
// Utils Tests
// ----------------------
describe("Utils", () => {
  describe("isFromLastMonth", () => {
    it("returns true if date is from last month", () => {
      const now = new Date();
      const lastMonth = new Date(now);
      lastMonth.setMonth(now.getMonth() - 1);

      const result = service.isFromLastMonth(lastMonth);
      expect(result).toBe(true);
    });

    it("returns false if date is from current month", () => {
      const now = new Date();
      const result = service.isFromLastMonth(now);
      expect(result).toBe(false);
    });

    it("handles year transition correctly", () => {
      // Test by creating a specific scenario instead of mocking Date
      // If current month is January (0), last month should be December of previous year
      const januaryFirst = new Date('2024-01-01');
      const decemberDate = new Date('2023-12-15');
      
      // Save original Date constructor
      const OriginalDate = global.Date;
      
      // Mock Date constructor to return January 1st when called without arguments
      global.Date = class extends OriginalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super('2024-01-01');
          } else {
            super(...args);
          }
        }
        
        static now() {
          return new OriginalDate('2024-01-01').getTime();
        }
      } as any;

      const result = service.isFromLastMonth(decemberDate);
      expect(result).toBe(true);
      
      // Restore original Date
      global.Date = OriginalDate;
    });
  });

  describe("isSubscriptionActive", () => {
    it("returns true if subscription is within 1 year", () => {
      const createdAt = new Date();
      createdAt.setMonth(createdAt.getMonth() - 6); // 6 months ago

      const result = service.isSubscriptionActive(createdAt);
      expect(result).toBe(true);
    });

    it("returns false if subscription expired after 1 year", () => {
      const createdAt = new Date();
      createdAt.setFullYear(createdAt.getFullYear() - 2); // 2 years ago

      const result = service.isSubscriptionActive(createdAt);
      expect(result).toBe(false);
    });

    it("works with string dates", () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const result = service.isSubscriptionActive(sixMonthsAgo.toISOString());
      expect(result).toBe(true);
    });
  });
});

//
// ----------------------
// getUserSubscriptionInfo Tests
// ----------------------
describe("getUserSubscriptionInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if no subscription exists", async () => {
    const mockDb = db as any;
    
    // Mock the select query to return empty array
    mockDb.select.mockImplementation(() => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]), // Empty array means no subscription
      };
      return mockQuery;
    });

    const result = await service.getUserSubscriptionInfo("user-123");
    expect(result).toBeNull();
  });

  it("resets balance if yearly subscription was updated last month and still active", async () => {
    const mockDb = db as any;
    
    const createdAt = new Date();
    createdAt.setMonth(createdAt.getMonth() - 6); // 6 months ago (still active)
    const updatedAt = new Date();
    updatedAt.setMonth(updatedAt.getMonth() - 1); // last month (needs reset)

    const fakeSub = [{
      id: "sub-1",
      userId: "user-123",
      interval: "year",
      updatedAt,
      createdAt,
      monthlyCredits: 100,
      fileStorageLimit: 10,
      balance: 50, // Current balance
      fileStorageUsed: 0,
      status: "active",
    }];

    // Setup select query mocks - first call returns subscription, second returns usage quotas
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve(fakeSub); // First call: subscription query
          } else {
            return Promise.resolve([]); // Second call: usage quotas query
          }
        }),
      };
      return mockQuery;
    });

    // Setup update query mock for balance reset
    const mockUpdateQuery = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValueOnce({}),
    };
    mockDb.update.mockReturnValue(mockUpdateQuery);

    const result = await service.getUserSubscriptionInfo("user-123");

    // Verify update was called to reset balance
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockUpdateQuery.set).toHaveBeenCalledWith({
      updatedAt: expect.any(Date),
      balance: 100, // Reset to monthlyCredits
      fileStorageRemaining: 10240, // fileStorageLimit * 1024
      fileStorageUsed: 0,
    });
    expect(mockUpdateQuery.where).toHaveBeenCalled();
    
    expect(result).toMatchObject({
      subscription: fakeSub[0],
      usageQuota: null,
      currentCredits: 50, // Original balance before reset
    });
  });

  it("marks subscription as canceled if canceledPeriodDate is past", async () => {
    const mockDb = db as any;
    
    const fakeSub = [{
      id: "sub-2",
      userId: "user-123",
      interval: "month",
      updatedAt: new Date(),
      createdAt: new Date(),
      status: "active",
      cancelAtPeriodEnd: true,
      canceledPeriodDate: new Date(Date.now() - 1000), // Already passed
    }];

    // Setup select query mock - only one call since it returns null early
    mockDb.select.mockImplementation(() => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce(fakeSub),
      };
      return mockQuery;
    });

    // Setup update query mock for status change
    const mockUpdateQuery = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValueOnce({}),
    };
    mockDb.update.mockReturnValue(mockUpdateQuery);

    const result = await service.getUserSubscriptionInfo("user-123");

    // Verify update was called to mark as canceled
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockUpdateQuery.set).toHaveBeenCalledWith({
      status: 'canceled',
      updatedAt: expect.any(Date),
    });
    
    expect(result).toBeNull();
  });

  it("returns subscription & quota if active", async () => {
    const mockDb = db as any;
    
    const fakeSub = [{
      id: "sub-3",
      userId: "user-123",
      interval: "month",
      updatedAt: new Date(),
      createdAt: new Date(),
      status: "active",
      balance: 50,
    }];

    const fakeQuota = [{
      userId: "user-123",
      periodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
    }];

    // Setup select query mocks - first call returns subscription, second returns usage quotas
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve(fakeSub); // First call: subscription
          } else {
            return Promise.resolve(fakeQuota); // Second call: usage quota
          }
        }),
      };
      return mockQuery;
    });

    const result = await service.getUserSubscriptionInfo("user-123");

    expect(result).toMatchObject({
      subscription: fakeSub[0],
      usageQuota: fakeQuota[0],
      currentCredits: 50,
    });
    
    // Verify both queries were made
    expect(selectCallCount).toBe(2);
  });

  it("returns null if subscription status is not active", async () => {
    const mockDb = db as any;
    
    const fakeSub = [{
      id: "sub-4",
      userId: "user-123",
      interval: "month",
      updatedAt: new Date(),
      createdAt: new Date(),
      status: "canceled", // Not active
      balance: 50,
    }];

    // Setup select query mocks
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          selectCallCount++;
          if (selectCallCount === 1) {
            return Promise.resolve(fakeSub); // First call: subscription
          } else {
            return Promise.resolve([]); // Second call: usage quotas
          }
        }),
      };
      return mockQuery;
    });

    const result = await service.getUserSubscriptionInfo("user-123");
    expect(result).toBeNull();
  });
});
-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'Forex',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startingCapital" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CapitalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "datetime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "CapitalEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "assetClass" TEXT NOT NULL DEFAULT 'Forex',
    "accountId" TEXT,
    "notes" TEXT,
    CONSTRAINT "Asset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Emotion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "strategyId" TEXT,
    "emotionId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'LONG',
    "size" DECIMAL NOT NULL,
    "entryTime" DATETIME NOT NULL,
    "entryPrice" DECIMAL NOT NULL,
    "stopLoss" DECIMAL,
    "takeProfit" DECIMAL,
    "exitTime" DATETIME,
    "exitPrice" DECIMAL,
    "fees" DECIMAL NOT NULL DEFAULT 0,
    "riskPct" REAL,
    "capitalUsagePct" REAL,
    "confidence" INTEGER,
    "discipline" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trade_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Trade_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Trade_emotionId_fkey" FOREIGN KEY ("emotionId") REFERENCES "Emotion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TradeScreenshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tradeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'POST',
    CONSTRAINT "TradeScreenshot_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "TradeMistake" (
    "tradeId" TEXT NOT NULL,
    "mistakeId" TEXT NOT NULL,

    PRIMARY KEY ("tradeId", "mistakeId"),
    CONSTRAINT "TradeMistake_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TradeMistake_mistakeId_fkey" FOREIGN KEY ("mistakeId") REFERENCES "Mistake" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "currentPrice" DECIMAL,
    "goal" TEXT,
    "technicals" TEXT,
    "fundamentals" TEXT,
    "news" TEXT,
    "source" TEXT,
    "riskReward" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "maxDrawdownPct" REAL NOT NULL DEFAULT 10,
    "profitTargetPct" REAL NOT NULL DEFAULT 20,
    "winRatePct" REAL NOT NULL DEFAULT 50
);

-- CreateIndex
CREATE INDEX "CapitalEvent_accountId_idx" ON "CapitalEvent"("accountId");

-- CreateIndex
CREATE INDEX "Asset_accountId_idx" ON "Asset"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Strategy_name_key" ON "Strategy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Emotion_name_key" ON "Emotion"("name");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_assetId_idx" ON "Trade"("assetId");

-- CreateIndex
CREATE INDEX "Trade_entryTime_idx" ON "Trade"("entryTime");

-- CreateIndex
CREATE INDEX "TradeScreenshot_tradeId_idx" ON "TradeScreenshot"("tradeId");

-- CreateIndex
CREATE UNIQUE INDEX "Mistake_name_key" ON "Mistake"("name");

-- CreateIndex
CREATE INDEX "TradeMistake_mistakeId_idx" ON "TradeMistake"("mistakeId");

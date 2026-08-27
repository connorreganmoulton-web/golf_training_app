-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homePar" INTEGER NOT NULL DEFAULT 36,
    "handicap" REAL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "playedAt" DATETIME NOT NULL,
    "course" TEXT,
    "holes" INTEGER NOT NULL DEFAULT 9,
    "par" INTEGER NOT NULL DEFAULT 36,
    "score" INTEGER NOT NULL,
    "gir" INTEGER,
    "fairways" INTEGER,
    "penalties" INTEGER,
    "doubles" INTEGER,
    "threePutts" INTEGER,
    "putts" INTEGER,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Round_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoundShot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "hole" INTEGER NOT NULL,
    "shotNo" INTEGER NOT NULL,
    "lie" TEXT NOT NULL,
    "distance" REAL NOT NULL,
    "club" TEXT,
    "penalty" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RoundShot_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "blockId" TEXT,
    "minutes" INTEGER,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT,
    CONSTRAINT "PracticeSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PracticeSession_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "club" TEXT NOT NULL,
    "clubBrand" TEXT,
    "clubModel" TEXT,
    "carry" REAL,
    "total" REAL,
    "ballSpeed" REAL,
    "clubSpeed" REAL,
    "smashFactor" REAL,
    "launchAngle" REAL,
    "launchDir" REAL,
    "apex" REAL,
    "sideCarry" REAL,
    "descentAngle" REAL,
    "attackAngle" REAL,
    "clubPath" REAL,
    "spinRate" REAL,
    "spinAxis" REAL,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Shot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT,
    "derived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Metric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "filename" TEXT,
    "checksum" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Round_userId_playedAt_idx" ON "Round"("userId", "playedAt");

-- CreateIndex
CREATE INDEX "RoundShot_roundId_hole_idx" ON "RoundShot"("roundId", "hole");

-- CreateIndex
CREATE INDEX "PracticeSession_userId_occurredAt_idx" ON "PracticeSession"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "Shot_sessionId_club_idx" ON "Shot"("sessionId", "club");

-- CreateIndex
CREATE INDEX "Metric_sessionId_key_idx" ON "Metric"("sessionId", "key");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_createdAt_idx" ON "ImportBatch"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportBatch_userId_checksum_key" ON "ImportBatch"("userId", "checksum");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

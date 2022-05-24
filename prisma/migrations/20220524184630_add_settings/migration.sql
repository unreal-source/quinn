-- CreateTable
CREATE TABLE "Settings" (
    "guild" TEXT NOT NULL,
    "shield" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("guild")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_guild_key" ON "Settings"("guild");

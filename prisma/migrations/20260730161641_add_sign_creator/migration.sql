-- CreateTable
CREATE TABLE "SignTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignTemplateSize" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "pageWidth" DOUBLE PRECISION NOT NULL,
    "pageHeight" DOUBLE PRECISION NOT NULL,
    "textBoxX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "textBoxY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "textBoxW" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "textBoxH" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logoBoxX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logoBoxY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logoBoxW" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "logoBoxH" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignTemplateSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sign" (
    "id" TEXT NOT NULL,
    "signSetId" TEXT NOT NULL,
    "templateSizeId" TEXT,
    "companyId" TEXT,
    "companyName" TEXT NOT NULL,
    "sponsorship" TEXT NOT NULL DEFAULT '',
    "sizeLabel" TEXT NOT NULL,
    "textOverride" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pdfPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignTemplateSize_templateId_label_key" ON "SignTemplateSize"("templateId", "label");

-- AddForeignKey
ALTER TABLE "SignTemplateSize" ADD CONSTRAINT "SignTemplateSize_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SignTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignSet" ADD CONSTRAINT "SignSet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SignTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sign" ADD CONSTRAINT "Sign_signSetId_fkey" FOREIGN KEY ("signSetId") REFERENCES "SignSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sign" ADD CONSTRAINT "Sign_templateSizeId_fkey" FOREIGN KEY ("templateSizeId") REFERENCES "SignTemplateSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sign" ADD CONSTRAINT "Sign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "message_chunks" ALTER COLUMN "message_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message_chunks" ALTER COLUMN "chunk_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message_query_chunks" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message_query_chunks" ALTER COLUMN "query_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message_query_chunks" ALTER COLUMN "chunk_id" SET NOT NULL;
-- DropForeignKey
ALTER TABLE "course_articles" DROP CONSTRAINT "course_articles_article_id_fkey";
ALTER TABLE "videos" DROP CONSTRAINT "videos_article_id_fkey";
ALTER TABLE "moderation_logs" DROP CONSTRAINT "moderation_logs_article_id_fkey";

-- AddForeignKey
ALTER TABLE "course_articles" ADD CONSTRAINT "course_articles_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "videos" ADD CONSTRAINT "videos_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

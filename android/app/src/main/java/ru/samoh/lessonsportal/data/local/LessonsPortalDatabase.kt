package ru.samoh.lessonsportal.data.local

import androidx.room.Database
import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "draft_articles")
data class DraftArticleEntity(
    @PrimaryKey val id: String,
    val articleId: String?,
    val title: String,
    val content: String,
    val categoryId: String?,
    val updatedAt: Long,
)

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String,
    val slug: String,
    val articleCount: Int,
)

@Entity(tableName = "articles")
data class ArticleEntity(
    @PrimaryKey val id: String,
    val title: String,
    val slug: String,
    val content: String?,
    val status: String,
    val authorId: String,
    val authorName: String,
    val categoryId: String,
    val categoryName: String,
    val categorySlug: String,
    val createdAt: String,
    val publishedAt: String?,
    val rejectionReason: String?,
    val videosJson: String,
    val cachedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "article_list_items")
data class ArticleListEntity(
    @PrimaryKey val id: String,
    val title: String,
    val slug: String,
    val status: String,
    val authorId: String,
    val authorName: String,
    val categoryId: String,
    val categoryName: String,
    val categorySlug: String,
    val createdAt: String,
    val publishedAt: String?,
    val coverUrl: String?,
    val hasVideo: Boolean,
)

@Dao
interface DraftArticleDao {
    @Query("SELECT * FROM draft_articles ORDER BY updatedAt DESC")
    fun observeDrafts(): Flow<List<DraftArticleEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(draft: DraftArticleEntity)

    @Query("DELETE FROM draft_articles WHERE id = :id")
    suspend fun delete(id: String)
}

@Dao
interface CategoryDao {
    @Query("SELECT * FROM categories ORDER BY name")
    suspend fun getAll(): List<CategoryEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun replaceAll(categories: List<CategoryEntity>)

    @Query("DELETE FROM categories")
    suspend fun clear()
}

@Dao
interface ArticleDao {
    @Query("SELECT * FROM articles WHERE id = :id")
    suspend fun getById(id: String): ArticleEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(article: ArticleEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun saveList(items: List<ArticleListEntity>)

    @Query("""SELECT * FROM article_list_items
        WHERE (:categoryId IS NULL OR categoryId = :categoryId)
        AND (:search IS NULL OR lower(title) LIKE '%' || lower(:search) || '%')
        ORDER BY createdAt DESC LIMIT :limit OFFSET :offset""")
    suspend fun getList(categoryId: String?, search: String?, limit: Int, offset: Int): List<ArticleListEntity>
}

@Database(entities = [DraftArticleEntity::class, CategoryEntity::class, ArticleEntity::class, ArticleListEntity::class], version = 3, exportSchema = false)
abstract class LessonsPortalDatabase : RoomDatabase() {
    abstract fun draftArticleDao(): DraftArticleDao
    abstract fun categoryDao(): CategoryDao
    abstract fun articleDao(): ArticleDao
}

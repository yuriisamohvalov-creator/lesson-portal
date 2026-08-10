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

@Dao
interface DraftArticleDao {
    @Query("SELECT * FROM draft_articles ORDER BY updatedAt DESC")
    fun observeDrafts(): Flow<List<DraftArticleEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun save(draft: DraftArticleEntity)

    @Query("DELETE FROM draft_articles WHERE id = :id")
    suspend fun delete(id: String)
}

@Database(entities = [DraftArticleEntity::class], version = 1, exportSchema = false)
abstract class LessonsPortalDatabase : RoomDatabase() {
    abstract fun draftArticleDao(): DraftArticleDao
}

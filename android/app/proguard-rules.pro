# Kotlin Serialization keeps generated serializers; retain annotated model metadata.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-if @kotlinx.serialization.Serializable class **
-keepclassmembers class <1> { static <1>$$serializer INSTANCE; }
-keep,includedescriptorclasses class **$$serializer { *; }
-keepclassmembers class **$Companion { kotlinx.serialization.KSerializer serializer(...); }

# Retrofit reads method and parameter annotations at runtime.
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations, AnnotationDefault
-keepclassmembers,allowshrinking,allowobfuscation interface * { @retrofit2.http.* <methods>; }
-dontwarn javax.annotation.**

# Room and Hilt generate referenced implementations; keep their annotations and constructors.
-keep @androidx.room.Entity class * { *; }
-keep @androidx.room.Database class * { *; }
-keep class * extends dagger.hilt.internal.GeneratedComponent { *; }
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn com.google.errorprone.annotations.CanIgnoreReturnValue
-dontwarn com.google.errorprone.annotations.CheckReturnValue
-dontwarn com.google.errorprone.annotations.Immutable
-dontwarn com.google.errorprone.annotations.RestrictedApi

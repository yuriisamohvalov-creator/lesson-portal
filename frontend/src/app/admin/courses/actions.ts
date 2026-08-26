'use server';

import { revalidatePath } from 'next/cache';

export async function revalidateCourses(courseId?: string) {
  revalidatePath('/courses');
  revalidatePath('/courses/[id]', 'page');
  if (courseId) {
    revalidatePath(`/courses/${courseId}`);
  }
}

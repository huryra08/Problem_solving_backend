const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

const enrollCourse = async (studentId, courseId, batchId = null) => {
  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");

  // Check if already enrolled
  let enrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });

  if (enrollment) {
    // (Bug 5 fixed: this used to be if (!enrollment), which was inverted)
    throw new Error("Already enrolled in this course");
  }

  // Create new enrollment
  enrollment = await Enrollment.create({
    student: studentId,
    course: courseId,
    batchId,
    progress: { completedLessons: [], percent: 0 },
  });

  return enrollment;
};

const getMyEnrollments = async (studentId) => {
  return Enrollment.find({ student: studentId })
    .populate("course", "title instructorName price category tags")
    .sort({ createdAt: -1 });
};

// CHANGED: added the userId parameter
// OLD: const completeLesson = async (enrollId, lessonId) => {
const completeLesson = async (enrollId, lessonId, userId) => {
  // NEW: reject a missing lesson ID so null is never saved
  if (!lessonId) throw new Error("lessonId is required");

  const enrollment = await Enrollment.findById(enrollId);
  if (!enrollment) throw new Error("Enrollment not found");

  // NEW: ownership check. Only the student who owns this enrollment can change it.
  // Same message as above on purpose, so the API does not reveal that the ID exists.
  if (String(enrollment.student) !== String(userId)) {
    const err = new Error("Enrollment not found");
    err.statusCode = 404;
    throw err;
  }

  // avoid duplicates
  const alreadyDone = enrollment.progress.completedLessons
    .map(String)
    .includes(String(lessonId));

  if (!alreadyDone) {
    enrollment.progress.completedLessons.push(lessonId);
  }

  // calculate percent
  const course = await Course.findById(enrollment.course);
  const totalLessons = course.syllabus.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );

  const completed = enrollment.progress.completedLessons.length;
  enrollment.progress.percent =
    totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);

  // (Bug 6 fixed: this used to be enrollment.save() without await)
  await enrollment.save();
  return enrollment;
};

module.exports = { enrollCourse, getMyEnrollments, completeLesson };
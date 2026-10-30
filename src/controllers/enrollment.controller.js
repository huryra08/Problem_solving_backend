const enrollmentService = require("../services/enrollment.service");

const enrollCourse = async (req, res) => {
  try {
    const enrollment = await enrollmentService.enrollCourse(
      req.user.id,
      req.params.courseId,
      req.body.batchId
    );
    res.status(201).json(enrollment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const myEnrollments = async (req, res) => {
  try {
    const data = await enrollmentService.getMyEnrollments(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const completeLesson = async (req, res) => {
  try {
    const data = await enrollmentService.completeLesson(
      req.params.enrollId,
      req.body.lessonId,
      req.user.id // NEW: pass the logged-in user so the service can check ownership
    );
    // OLD (no ownership check): the call had only two arguments
    // const data = await enrollmentService.completeLesson(
    //   req.params.enrollId,
    //   req.body.lessonId
    // );
    res.json(data);
  } catch (err) {
    // CHANGED: use the status code set by the service (404), default to 400
    res.status(err.statusCode || 400).json({ message: err.message });
    // OLD: always 400
    // res.status(400).json({ message: err.message });
  }
};

module.exports = { enrollCourse, myEnrollments, completeLesson };
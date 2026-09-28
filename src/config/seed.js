import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CategoryModel } from '../models/category.schema.js';
import { UserModel } from '../models/user.schema.js';
import { CourseModel } from '../models/course.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedDatabase = async () => {
  try {
    const categoriesPath = path.join(__dirname, 'Categories.json');
    const teachersPath = path.join(__dirname, 'teachers.json');
    const coursesPath = path.join(__dirname, 'cursos.json');

    // 1. Sembrar Categorías si la colección está vacía
    const catCount = await CategoryModel.countDocuments();
    let categoriesList = [];
    if (catCount === 0 && fs.existsSync(categoriesPath)) {
      const rawCat = fs.readFileSync(categoriesPath, 'utf-8');
      const catData = JSON.parse(rawCat);
      categoriesList = await CategoryModel.insertMany(catData);
      console.log(`✅ Se sembraron ${categoriesList.length} categorías en MongoDB`);
    } else {
      categoriesList = await CategoryModel.find();
    }

    // 2. Sembrar Instructores si no existen
    const teacherCount = await UserModel.countDocuments({ rol: 'instructor' });
    let teachersList = [];
    if (teacherCount === 0 && fs.existsSync(teachersPath)) {
      const rawTeacher = fs.readFileSync(teachersPath, 'utf-8');
      const teacherData = JSON.parse(rawTeacher);
      const preparedTeachers = teacherData.map((t) => ({
        ...t,
        rol: 'instructor',
        passwordHash: 'Instructor123!'
      }));
      teachersList = await UserModel.insertMany(preparedTeachers);
      console.log(`✅ Se sembraron ${teachersList.length} instructores en MongoDB`);
    } else {
      teachersList = await UserModel.find({ rol: 'instructor' });
    }

    // 3. Sembrar Cursos si la colección está vacía
    const courseCount = await CourseModel.countDocuments();
    if (courseCount === 0 && fs.existsSync(coursesPath)) {
      const rawCourse = fs.readFileSync(coursesPath, 'utf-8');
      const courseData = JSON.parse(rawCourse);

      const defaultCatId = categoriesList[0]?._id;
      const defaultTeacherId = teachersList[0]?._id;

      const preparedCourses = courseData.map((c, idx) => ({
        ...c,
        categoria: categoriesList[idx % categoriesList.length]?._id || defaultCatId,
        instructor: teachersList[idx % teachersList.length]?._id || defaultTeacherId,
        activo: true,
        eliminado: false,
        estado: 'published'
      }));

      await CourseModel.insertMany(preparedCourses);
      console.log(`✅ Se sembraron ${preparedCourses.length} cursos en MongoDB`);
    }
  } catch (error) {
    console.error('❌ Error al sembrar la base de datos:', error.message);
  }
};

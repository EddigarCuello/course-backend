import test from 'node:test';
import assert from 'node:assert/strict';
import { createId, isValidId, mapCourse } from '../src/db/helpers.js';

test('createId returns an ObjectId-compatible identifier', () => {
  assert.match(createId(), /^[a-f\d]{24}$/);
});

test('isValidId accepts only 24-character hexadecimal IDs', () => {
  assert.equal(isValidId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidId('507f1f77bcf86cd79943901z'), false);
  assert.equal(isValidId(undefined), false);
});

test('mapCourse preserves the API shape with populated relations', () => {
  const mapped = mapCourse({
    _id: '507f1f77bcf86cd799439011',
    precio: '125.50',
    categoria_data: { _id: '507f1f77bcf86cd799439012', nombre: 'Cloud' },
    instructor_data: { _id: '507f1f77bcf86cd799439013', nombre: 'Ada' }
  });
  assert.equal(mapped.precio, 125.5);
  assert.equal(mapped.categoria.nombre, 'Cloud');
  assert.equal(mapped.instructor.nombre, 'Ada');
  assert.equal('categoria_data' in mapped, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { isS3Configured } from '../src/services/s3.service.js';
import { authRequired, adminRequired } from '../src/middlewares/auth.middleware.js';

test('isS3Configured returns false when no S3 bucket is defined', () => {
  const oldBucket = process.env.S3_BUCKET_NAME;
  const oldAwsBucket = process.env.AWS_S3_BUCKET;
  delete process.env.S3_BUCKET_NAME;
  delete process.env.AWS_S3_BUCKET;

  assert.equal(isS3Configured(), false);

  if (oldBucket) process.env.S3_BUCKET_NAME = oldBucket;
  if (oldAwsBucket) process.env.AWS_S3_BUCKET = oldAwsBucket;
});

test('authRequired blocks requests without Authorization header', () => {
  const req = { headers: {} };
  let status = null;
  let json = null;
  const res = {
    status: (s) => { status = s; return { json: (j) => { json = j; } }; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  authRequired(req, res, next);

  assert.equal(status, 401);
  assert.equal(nextCalled, false);
});

test('adminRequired blocks non-admin users', () => {
  const req = { user: { id: '123', rol: 'student' } };
  let status = null;
  const res = {
    status: (s) => { status = s; return { json: () => {} }; }
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  adminRequired(req, res, next);

  assert.equal(status, 403);
  assert.equal(nextCalled, false);
});

test('adminRequired allows admin users', () => {
  const req = { user: { id: '123', rol: 'admin' } };
  let nextCalled = false;
  const next = () => { nextCalled = true; };

  adminRequired(req, {}, next);

  assert.equal(nextCalled, true);
});

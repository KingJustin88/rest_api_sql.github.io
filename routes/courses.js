'use strict';

// require express
const express = require('express');

//construct the router
const router = express.Router();

// require sequelize
const Sequelize = require('sequelize');

// require bcrypt to hash passwords
const bcryptjs = require('bcryptjs');

// require basic-auth
const auth = require('basic-auth');

// validator
const { check, validationResult } = require("express-validator/check");

// requiring user and course from models
const User = require('../models').User;
const Course = require('../models').Course;


// function to handle all errors
function asyncHandler(cb){
    return async (req, res, next)=>{
      try {
        await cb(req,res, next);
      } catch(err){
        next(err);
      }
    };
  }

// authenticate users
const authenticateUser = async (req, res, next) => {
  let message = null;

  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);

  // If the user's credentials are available...
  if (credentials) {
      // Attempt to retrieve the user from the data store
      // by their username (i.e. the user's "key"
      // from the Authorization header).
      const user = await User.findOne({ where: { emailAddress: credentials.name }});

      // If a user was successfully retrieved from the data store...
      if (user) {
      // Use the bcryptjs npm package to compare the user's password
      // (from the Authorization header) to the user's password
      // that was retrieved from the data store.
      const authenticated = bcryptjs
          .compareSync(credentials.pass, user.password);

      // If the passwords match...
      if (authenticated) {
          console.log(`Authentication successful for username: ${user.firstName} ${user.lastName}`);

          // Then store the retrieved user object on the request object
          // so any middleware functions that follow this middleware function
          // will have access to the user's information.
          req.currentUser = user;
      } else {
          message = `Authentication failure for username: ${user.firstName} ${user.lastName}`;
      }
      } else {
      message = `User not found for username: ${credentials.name}`;
      }
  }   else {
      message = 'Auth header not found';
      }

  // If user authentication failed...
  if (message) {
      console.warn(message);

      // Return a response with a 401 Unauthorized HTTP status code.
      res.status(401).json({ message: 'Not Authorized' });
  }   else {
      // Or if user authentication succeeded...
      // Call the next() method.
      next();
      }
};  

// GET /api/courses 200 - returns list of course
router.get('/courses', asyncHandler( async(req, res) => {
  const courses = await Course.findAll({
    include: [{
      model: User,
      attributes: ["id", "firstName", "lastName", "emailAddress"]
    }]
  });
  res.json({ courses })
}));

// GET /api/courses/:id - returns a course; specific to the id
router.get('/courses/:id', asyncHandler( async(req, res) => {
  const course = await Course.findByPk(req.params.id, {
    include: [{
      model: User,
      attributes: ["id", "firstName", "lastName", "emailAddress"]
    }]
  });
  if(course) {
    res.json({ course })
  } else {
    res.status(404).json({message: 'Course does not exisit'})
  }
  
}));

// POST /api/course 201 - creates a course, sets the location header for the URI, returns no content
router.post('/courses', [
  check('title')
    .exists()
    .withMessage('Please provide a "title" for the course'),
  check('description')
    .exists()
    .withMessage('Please provide a "description" for the course'),
], 
  authenticateUser, asyncHandler( async(req, res) => {

  // attempt to get the validation result from the Request object
  const errors = validationResult(req);

  // handles errors if any
  if(!errors.isEmpty()) {
    // use the array 'map()' to get a list of error messages
    const errorMessages = errors.array().map(error => error.msg);

    // return rendering the validation errors to the client
    res.status(400).json({ errors: errorMessages });
  } else { 

    // Get the user from the request body.
    const course = req.body; 
    
    // create user
    const addCourse = await Course.create({
      title: course.title,
      description: course.description,
      userId: course.userId
    });
    
    // new course id for location header
    const id = addCourse.id;

    // status 201, location created, and end response
    res.location(`/api/courses/${id}`).status(201).end();
  }  
}));

// PUT /api/course/:id 204 - updates a course and returns no content
router.put('/courses/:id', [
  check('title')
    .exists()
    .withMessage('Please provide a "title" for the course'),
  check('description')
    .exists()
    .withMessage('Please provide a "description" for the course'),
], 
  authenticateUser, asyncHandler( async(req, res) => {

  // attempt to get the validation result from the Request object
  const errors = validationResult(req);

  // handles errors if any
  if(!errors.isEmpty()) {
    // use the array 'map()' to get a list of error messages
    const errorMessages = errors.array().map(error => error.msg);

    // return rendering the validation errors to the client
    res.status(400).json({ errors: errorMessages });
  } else {

    // look for existing course
    const course = await Course.findByPk(req.params.id, {
      attributes: ["id", "title", "description", "userId"],
      include: [{
        model: User,
        attributes: ["id", "firstName", "lastName", "emailAddress"]
      }]  
    });

    // check for course if it exists
    if (course) {
      // if course matches current user id
      if (course.userId === req.currentUser.id) {
        // update the course
        const updateCourse = await Course.update({
          title: req.body.title,
          description: req.body.description,
          estimatedTime: req.body.estimatedTime,
          materialsNeeded: req.body.materialsNeeded
        }, {
          where: {
            id: course.id
          }
        });        
        if(updateCourse) {
          res.status(204).end();
        }
      } else {
        // updating on the wrong course id
        res.status(403).json({message: "Access Denied"});
      } 
    } else {
      // course can't be found
      res.status(404).json({message: "No Course found"})       
    }   
  } 
}));

// DELETE /api/course/:id 204 - deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, asyncHandler( async(req, res) => {
  // find course
  const course = await Course.findByPk(req.params.id, {
    attributes: ["id", "title", "description", "userId"],
    include: [{
      model: User,
      attributes: ["id", "firstName", "lastName", "emailAddress"]  
    }]  
  });

  // check if course exists
  if (course) {
    if (course.userId === req.currentUser.id){
      // deletes course
      const deleteCourse = await Course.destroy({
        where: {
          id: course.id
        }
      });
      if (deleteCourse) {
        res.status(204).end();
      } 
    } else {
        // deleting on the wrong course id
        res.status(403).json({message: "Access Denied"});
      } 
    } else {
      // course can't be found
      res.status(404).json({message: "No Course found"})       
    } 
  }  
));

module.exports = router;
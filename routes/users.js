// require express
const express = require('express');

//construct the router
const router = express.Router();

// require sequelize
const Sequelize = require('sequelize');

// require validator
const { check, validationResult } = require('express-validator');

// require bcrypt to hash passwords
const bcryptjs = require('bcryptjs');

// require basic-auth
const auth = require('basic-auth');

const User = require('../models').User;


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



// Route that returns the current authenticated user.
router.get('/users', authenticateUser, (req, res) => {
  const user = req.currentUser;
  res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.emailAddress
  });
});




// POST /users 201 - creates user
router.post('/users', [
  // authenticates name, username, password
  check('firstName')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('Please provide a value for "first name" '),
  check('lastName')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('Please provide a value for "last name" '),
  check('emailAddress')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('Please provide a value for "email address" ')
    .isEmail()
    .withMessage('Please enter a valid "email address"'),
  check('password')
    .exists({checkNull: true, checkFalsy: true})
    .withMessage('Please provide a value for "password" '),
  ], 
  asyncHandler( async(req, res) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);

        // If there are validation errors...
    if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map(error => error.msg);
  
      // Return the validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
    }
  
    // Get the user from the request body.
    const user = req.body;

    // check if email exists from another user 
    const existEmail = await User.findOne({
        where: {
          emailAddress: user.emailAddress
        }
    });

    if(existEmail) {
      res.status(400).json({message: "The email you have entered already exist, please enter a new one"})
    } else {
      // hash the new user's password
    user.password = bcryptjs.hashSync(user.password);
  
    // Add the user to the `users` array.
    User.create({
      firstName: user.firstName,
      lastName: user.lastName,
      emailAddress: user.emailAddress,
      password: user.password
    });
  
    // Set the status to 201 Created and end the response.
    return res.status(201).end();
    }
}));

// DELETE /api/users/:id 204 - deletes a course and returns no content
router.delete('/users/:id', authenticateUser, asyncHandler( async(req, res) => {
  // find users
  const user = await User.findByPk(req.params.id);
    if(user) {
      await User.destroy({
        where: {
          id: user.id
        }
      })
      } else {
        // user can't be found
        res.status(404).json({message: "No User found"})
      }
      return res.status(404).end();
}));


module.exports = router;
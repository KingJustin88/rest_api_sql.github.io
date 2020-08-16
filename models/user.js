const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    class User extends Sequelize.Model {
    }
    User.init({
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        firstName: {
            type: Sequelize.STRING,
            validate: {
                notEmpty: {
                    msg: 'First name is required'
                }
            }
        },
        lastName: {
            type: Sequelize.STRING,
            validate: {
                notEmpty: {
                    msg: 'Last name is required' 
                }
            }
        },
        emailAddress: {
            type: Sequelize.STRING,
            validate: {
                notEmpty: {
                    msg: 'Email address is required'
                },
                isEmail: {
                    msg: 'Please enter a valid email address.'
                }
            },
        },
        password: {
            type: Sequelize.STRING,
            validate: {
                notEmpty: {
                    msg: 'Password is required'
                }
            }
        },
        
    },{ timestamps: true, sequelize });

    User.associate = (models) => {
        User.hasMany(models.Course, {
            foreignKey: {
                fieldName: 'userId',
                allowNull: false
            }
        });
    };

    return User;
};
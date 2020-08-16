const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    class Course extends Sequelize.Model {   
    }
    Course.init({
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userid: {
            type: Sequelize.INTEGER
        },
        title: {
            type: Sequelize.STRING,
            validate: {
                notEmpty: {
                    msg: 'Title is required'
                }
            }
        },
        description: {
            type: Sequelize.TEXT,
            validate: {
                notEmpty: {
                    msg: 'Description is required'
                }
            }
        },
        estimatedTime: {
            type: Sequelize.STRING,
            required: false,
            allowNull: true
        },
        materialsNeeded: {
            type: Sequelize.STRING,
            required: false,
            allowNull: true
        }

    },{ timestamps: true, sequelize });

    Course.associate = (models) => {
        Course.belongsTo(models.User, {
            foreignKey: {
                fieldName: 'userId',
                allowNull: false
            }
        });
    };

    return Course;
};
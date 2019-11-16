const { AuthenticationError, ApolloError } = require('apollo-server')
// google verification client
const { OAuth2Client } = require('google-auth-library')
const User = require('../models/User')

// init google client
const client = new OAuth2Client(process.env.CLIENT_ID)

module.exports = {
  Query: {
    getUsers: async () => {
      try {
        const users = await User.find()
        return users
      } catch(err) {
        throw new ApolloError(err.message)
      }
    }
  },
  Mutation: {
    register: async (_, { token }) => {
      try {
        // decode user token and verify if its provided by an official google services
        const ticket = await client.verifyIdToken({
          idToken: token,
          audience: process.env.CLIENT_ID
        })
        const { email, name, sub } = ticket.getPayload()
    
        // check if user already exists in the database
        const foundUser = await User.findOne({ sub: sub })

        if (foundUser) {
          // if user exists in the DB, return an object that matches graphql User Type
          return { sub: foundUser.sub, email: foundUser.email, name: foundUser.name, createdAt: foundUser.createdAt }
        } else {
          // if user doesn't already exist
          // add him to the DB
          const createdAt = new Date().toISOString()
          const newUser = new User({ email, name, sub, createdAt })
          const res = await newUser.save() 
          // and return an object that matches graphql User Type
          return { sub: res.sub, email: res.email, name: res.name, createdAt: res.createdAt }
        }
      } catch(e) { throw new ApolloError(e.message) }
    }
  }
}
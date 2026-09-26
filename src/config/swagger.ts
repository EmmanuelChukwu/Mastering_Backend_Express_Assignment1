import swaggerJsdoc from "swagger-jsdoc";

/*
 * Swagger/OpenAPI describes our HTTP API.
 *
 * swagger-jsdoc:
 *   Reads the JSDoc comments above our routes.
 *
 * swagger-ui-express:
 *   Turns the generated specification into
 *   an interactive webpage.
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "DocuChat API",
      version: "1.0.0",
      description: "AI-Powered Document Q&A System",
    },

    /*
     * This tells Swagger that our actual API endpoints
     * are mounted under /api/v1.
     */
    servers: [
      {
        url: "/api/v1",
        description: "Version 1",
      },
    ],

    /*
     * Tell Swagger that our protected endpoints use
     * a JWT in:
     *
     * Authorization: Bearer <token>
     */
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },

    security: [
      {
        bearerAuth: [],
      },
    ],
  },

  /*
   * swagger-jsdoc searches these files for @swagger
   * comments.
   */
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
import { gql, GraphQLClient } from "graphql-request";

const storefrontAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

const endpoint = process.env.GRAPHQL_API_URL;

export const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
  },
});

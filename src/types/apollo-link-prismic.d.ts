// https://github.com/prismicio/apollo-link-prismic/issues/9
declare module 'apollo-link-prismic' {
  export function PrismicLink(args: { uri: string; accessToken?: string }): any
}

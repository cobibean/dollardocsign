import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

export const appMetaTags = (title?: string) => {
  const description =
    'Dollar DocSign is the $1/mo signing stack for founders and freelancers. Built on Documenso CE, it delivers fast signing, predictable usage-based limits, and simple upgrade paths for small teams.';

  return [
    {
      title: title ? `${title} - Dollar DocSign` : 'Dollar DocSign',
    },
    {
      name: 'description',
      content: description,
    },
    {
      name: 'keywords',
      content:
        'Dollar DocSign, Documenso fork, open source DocuSign alternative, document signing, founder tools, affordable signing, SaaS case study',
    },
    {
      name: 'author',
      content: 'Dollar DocSign',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: 'Dollar DocSign - The $1/mo DocuSign Alternative',
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:site',
      content: '@dollardocsign',
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
  ];
};

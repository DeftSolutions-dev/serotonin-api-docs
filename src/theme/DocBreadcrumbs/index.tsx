import React from 'react';
import Breadcrumbs from '@theme-original/DocBreadcrumbs';
import type BreadcrumbsType from '@theme/DocBreadcrumbs';
import type { WrapperProps } from '@docusaurus/types';
import PageActions from '@site/src/components/PageActions';

type Props = WrapperProps<typeof BreadcrumbsType>;

export default function BreadcrumbsWrapper(props: Props): JSX.Element {
  return (
    <div className="ser-breadcrumb-row">
      <div className="ser-breadcrumb-row__crumbs">
        <Breadcrumbs {...props} />
      </div>
      <div className="ser-breadcrumb-row__actions">
        <PageActions />
      </div>
    </div>
  );
}

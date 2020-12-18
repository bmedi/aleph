import React, { Component } from 'react';
import { defineMessages, injectIntl } from 'react-intl';
import queryString from 'query-string';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';

import Screen from 'components/Screen/Screen';
import CollectionManageMenu from 'components/Collection/CollectionManageMenu';
import CollectionContextLoader from 'components/Collection/CollectionContextLoader';
import DocumentDropzone from 'components/Document/DocumentDropzone';
import collectionViewIds from 'components/Collection/collectionViewIds';
import { Breadcrumbs, SearchBox } from 'components/common';
import { queryCollectionEntities } from 'queries';

const messages = defineMessages({
  placeholder: {
    id: 'collection.search.placeholder',
    defaultMessage: 'Search this dataset',
  },
  placeholder_casefile: {
    id: 'collection.search.placeholder',
    defaultMessage: 'Search this investigation',
  },
});

export class CollectionWrapper extends Component {
  constructor(props) {
    super(props);

    this.onUploadSuccess = this.onUploadSuccess.bind(this);
    this.onSearch = this.onSearch.bind(this);
  }

  onSearch(queryText) {
    const { history, location, query } = this.props;

    const newQuery = query.set('q', queryText);

    history.push({
      pathname: location.pathname,
      hash: queryString.stringify({ mode: 'search' }),
      search: newQuery.toLocation()
    });
  }

  onUploadSuccess() {
    const { history, location } = this.props;
    const parsedHash = queryString.parse(location.hash);

    parsedHash.mode = collectionViewIds.DOCUMENTS;
    delete parsedHash.type;

    history.push({
      pathname: location.pathname,
      search: location.search,
      hash: queryString.stringify(parsedHash),
    });
  }

  render() {
    const {
      activeMode, children, collection, query, intl, isCasefile
    } = this.props;

    const search = !!collection && (
      <SearchBox
        onSearch={this.onSearch}
        placeholder={intl.formatMessage(messages[isCasefile ? 'placeholder_casefile' : 'placeholder'])}
        query={query}
        inputProps={{ disabled: collection.isPending }}
      />
    );

    const operation = <CollectionManageMenu collection={collection} view="collapsed" />;
    const breadcrumbs = (
      <Breadcrumbs operation={operation} search={search} type={isCasefile ? 'casefile' : 'dataset'}>
        <Breadcrumbs.Collection key="collection" collection={collection} showCategory={!isCasefile} active={!activeMode} />
      </Breadcrumbs>
    );

    return (
      <>
        {breadcrumbs}
        <DocumentDropzone
          canDrop={collection.writeable}
          collection={collection}
          onUploadSuccess={this.onUploadSuccess}
        >
          {children}
        </DocumentDropzone>
      </>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { collection, location, forceCasefile } = ownProps;
  if (!collection) {
    return {};
  }
  const hashQuery = queryString.parse(location.hash);
  const activeMode = hashQuery.mode;
  const query = queryCollectionEntities(activeMode === 'search' && location, collection.id);

  return {
    isCasefile: forceCasefile || collection.casefile,
    activeMode,
    query,
  };
};


export default compose(
  withRouter,
  connect(mapStateToProps),
  injectIntl,
)(CollectionWrapper);

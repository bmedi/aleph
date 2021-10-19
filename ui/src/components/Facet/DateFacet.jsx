import React, { Component } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { defineMessages, FormattedMessage, injectIntl } from 'react-intl';
import queryString from 'query-string';
import { Button, Card, Icon, Intent, Spinner } from '@blueprintjs/core';
import { Histogram } from '@alephdata/react-ftm';

import { DEFAULT_START_INTERVAL, filterDateIntervals, formatDateQParam, timestampToYear } from 'components/Facet/util';


import './DateFacet.scss';

const DATE_FACET_HEIGHT = 140;

const messages = defineMessages({
  results: {
    id: 'search.screen.dates_label',
    defaultMessage: 'results',
  },
});

export class DateFilter extends Component {
  constructor(props) {
    super(props);
    this.onSelect = this.onSelect.bind(this);
    this.toggleShowHidden = this.toggleShowHidden.bind(this);
  }

  onSelect(selected) {
    const { field, query, updateQuery } = this.props;

    const currFacetInterval = query.getString(`facet_interval:${field}`)
    let newRange;
    let newQuery = query;

    if (Array.isArray(selected)) {
      newRange = selected.sort().map(val => formatDateQParam(val, currFacetInterval));
    } else {
      if (currFacetInterval === 'year') {
        newQuery = newQuery.set(`facet_interval:${field}`, 'month')
        const dateObj = new Date(selected)
        const end = new Date(Date.UTC(dateObj.getFullYear(), 11, 31)).toISOString()
        newRange = [formatDateQParam(selected, 'month'), formatDateQParam(end, 'month')]
      } else if (currFacetInterval === 'month') {
        newQuery = newQuery.set(`facet_interval:${field}`, 'day')
        const dateObj = new Date(selected)
        const end = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), 31)).toISOString()
        newRange = [formatDateQParam(selected, 'day'), formatDateQParam(end, 'day')]
      } else {
        newRange = [formatDateQParam(selected, 'day'), formatDateQParam(selected, 'day')]
      }
    }
    newQuery = newQuery.setFilter(`gte:${field}`, newRange[0])
      .setFilter(`lte:${field}`, newRange[1]);

    updateQuery(newQuery)
  }

  toggleShowHidden() {
    const { query, history, location, showAll } = this.props;

    const parsedHash = queryString.parse(location.hash);
    parsedHash['show_all_dates'] = !showAll;

    history.push({
      pathname: location.pathname,
      search: query.toLocation(),
      hash: queryString.stringify(parsedHash),
    });
  }

  renderShowHiddenToggle() {
    const { showAll } = this.props;
    const button = (
      <Button minimal small intent={Intent.PRIMARY} onClick={this.toggleShowHidden}>
        <FormattedMessage
          id="search.screen.dates.show-hidden.click"
          defaultMessage="Click here"
        />
      </Button>
    );

    return (
      <div className="DateFacet__secondary text-muted">
        {!showAll && (
          <FormattedMessage
            id="search.screen.dates.show-hidden"
            defaultMessage="* Showing only date filter options from {start} to the present. { button } to view dates outside this range."
            values={{ start: DEFAULT_START_INTERVAL, button }}
          />
        )}
        {showAll && (
          <FormattedMessage
            id="search.screen.dates.show-all"
            defaultMessage="* Showing all date filter options. { button } to view recent dates only."
            values={{ button }}
          />
        )}
      </div>
    );
  }

  render() {
    const { dataLabel, emptyComponent, filteredIntervals, intl, displayShowHiddenToggle, showAll, showLabel = true } = this.props;
    let content;

    console.log('intervals', filteredIntervals)

    if (filteredIntervals) {
      if (!filteredIntervals.length) {
        content = emptyComponent;
      } else {
        const dataPropName = dataLabel || intl.formatMessage(messages.results);

        content = (
          <>
            <Histogram
              data={filteredIntervals.map(({ label, count, ...rest }) => ({ label: timestampToYear(label), [dataPropName]: count, ...rest }))}
              dataPropName={dataPropName}
              onSelect={this.onSelect}
              containerProps={{
                height: DATE_FACET_HEIGHT,
              }}
            />
            {(displayShowHiddenToggle || showAll) && this.renderShowHiddenToggle()}
          </>
        )
      }
    } else {
      content = (
        <div style={{ minHeight: `${DATE_FACET_HEIGHT}px` }}>
          <Spinner />
        </div>
      );
    }

    return (
      <Card className="DateFacet">
        {showLabel && (
          <div className="DateFacet__label">
            <Icon icon="calendar" className="left-icon" />
            <span className="DateFacet__label__text">
              <FormattedMessage id="search.screen.dates_title" defaultMessage="Dates" />
              {displayShowHiddenToggle && "*"}
            </span>
          </div>
        )}
        {content}
      </Card>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { field, location, intervals, query } = ownProps;
  const hashQuery = queryString.parse(location.hash);

  const showAll = hashQuery.show_all_dates === 'true';

  if (intervals) {
    const { filteredIntervals, hasOutOfRange } = filterDateIntervals({ field, query, intervals, useDefaultBounds: !showAll })
    return {
      filteredIntervals,
      displayShowHiddenToggle: hasOutOfRange,
      showAll
    };
  }
  return {};
};

export default compose(
  withRouter,
  connect(mapStateToProps),
  injectIntl,
)(DateFilter);

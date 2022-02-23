import { Col, Row } from 'antd';
import React, { useRef, useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import { useMarket, useOrderbook, useMarkPrice } from '../utils/markets';
import { isEqual, getDecimalCount } from '../utils/utils';
import { useInterval } from '../utils/useInterval';
import FloatingElement from './layout/FloatingElement';
import usePrevious from '../utils/usePrevious';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const Title = styled.div`
  color: rgba(255, 255, 255, 1);
`;

const SizeTitle = styled(Row)`
  padding: 16px 0 12px;
  color: #434a59;
`;

const MarkPriceTitle = styled(Row)`
  padding: 15px 0 12px;
  font-weight: 700;
`;

const Line = styled.div`
  text-align: right;
  float: right;
  height: 100%;
  ${(props) =>
    props['data-width'] &&
    css`
      width: ${props['data-width']};
    `}
  ${(props) =>
    props['data-bgcolor'] &&
    css`
      background-color: ${props['data-bgcolor']};
    `}
`;

const Price = styled.div`
  position: absolute;
  right: 5px;
  color: white;
`;

export default function Orderbook({ smallScreen, depth = 7, onPrice, onSize }) {
  const markPrice = useMarkPrice();
  const [orderbook] = useOrderbook();
  const { baseCurrency, quoteCurrency } = useMarket();

  const currentOrderbookData = useRef(null);
  const lastOrderbookData = useRef(null);

  const [orderbookData, setOrderbookData] = useState(null);

  useInterval(() => {
    if (
      !currentOrderbookData.current ||
      JSON.stringify(currentOrderbookData.current) !==
        JSON.stringify(lastOrderbookData.current)
    ) {
      let bids = orderbook?.bids || [];
      let asks = orderbook?.asks || [];

      let sum = (total, [, size], index) =>
        index < depth ? total + size : total;
      let totalSize = bids.reduce(sum, 0) + asks.reduce(sum, 0);

      let bidsToDisplay = getCumulativeOrderbookSide(bids, totalSize, false);
      let asksToDisplay = getCumulativeOrderbookSide(asks, totalSize, true);

      currentOrderbookData.current = {
        bids: orderbook?.bids,
        asks: orderbook?.asks,
      };

      setOrderbookData({ bids: bidsToDisplay, asks: asksToDisplay });
    }
  }, 250);

  useEffect(() => {
    lastOrderbookData.current = {
      bids: orderbook?.bids,
      asks: orderbook?.asks,
    };
  }, [orderbook]);

  function getCumulativeOrderbookSide(orders, totalSize, backwards = false) {
    let cumulative = orders
      .slice(0, depth)
      .reduce((cumulative, [price, size], i) => {
        const cumulativeSize = (cumulative[i - 1]?.cumulativeSize || 0) + size;
        cumulative.push({
          price,
          size,
          cumulativeSize,
          sizePercent: Math.round((cumulativeSize / (totalSize || 1)) * 100),
        });
        return cumulative;
      }, []);
    if (backwards) {
      cumulative = cumulative.reverse();
    }
    return cumulative;
  }

  return (
    <FloatingElement
      style={{
        ...(smallScreen
          ? { flex: 1 }
          : { height: '500px', overflow: 'hidden' }),
        height: 540,
      }}
    >
      <Title
        style={{
          borderTop: '1px solid #00073D',
          borderBottom: '1px solid #00073D',
          padding: '12px 0 12px 16px',
          color: 'rgba(241, 241, 242, 0.75)',
          fontSize: 14,
        }}
      >
        Order book
      </Title>
      <SizeTitle>
        <Col
          span={12}
          style={{
            textAlign: 'right',
            color: '#004BAF',
            opacity: 0.5,
            fontSize: 12,
          }}
        >
          Size ({baseCurrency})
        </Col>
        <Col
          span={12}
          style={{
            textAlign: 'right',
            paddingRight: 20,
            color: '#004BAF',
            opacity: 0.5,
            fontSize: 12,
          }}
        >
          Price ({quoteCurrency})
        </Col>
      </SizeTitle>
      <div style={{ paddingBottom: 16 }}>
        {orderbookData?.asks.map(({ price, size, sizePercent }) => (
          <OrderbookRow
            key={price + ''}
            price={price}
            size={size}
            side={'sell'}
            sizePercent={sizePercent}
            onPriceClick={() => onPrice(price)}
            onSizeClick={() => onSize(size)}
          />
        ))}
      </div>
      <MarkPriceComponent markPrice={markPrice} />
      <SizeTitle>
        <Col
          span={12}
          style={{
            textAlign: 'right',
            color: '#004BAF',
            opacity: 0.5,
            fontSize: 12,
          }}
        >
          Size ({baseCurrency})
        </Col>
        <Col
          span={12}
          style={{
            textAlign: 'right',
            paddingRight: 20,
            color: '#004BAF',
            opacity: 0.5,
            fontSize: 12,
          }}
        >
          Price ({quoteCurrency})
        </Col>
      </SizeTitle>
      {orderbookData?.bids.map(({ price, size, sizePercent }) => (
        <OrderbookRow
          key={price + ''}
          price={price}
          size={size}
          side={'buy'}
          sizePercent={sizePercent}
          onPriceClick={() => onPrice(price)}
          onSizeClick={() => onSize(size)}
        />
      ))}
    </FloatingElement>
  );
}

const OrderbookRow = React.memo(
  ({ side, price, size, sizePercent, onSizeClick, onPriceClick }) => {
    const element = useRef();

    const { market } = useMarket();

    useEffect(() => {
      // eslint-disable-next-line
      !element.current?.classList.contains('flash') &&
        element.current?.classList.add('flash');
      const id = setTimeout(
        () =>
          element.current?.classList.contains('flash') &&
          element.current?.classList.remove('flash'),
        250,
      );
      return () => clearTimeout(id);
    }, [price, size]);

    let formattedSize =
      market?.minOrderSize && !isNaN(size)
        ? Number(size).toFixed(getDecimalCount(market.minOrderSize) + 1)
        : size;

    let formattedPrice =
      market?.tickSize && !isNaN(price)
        ? Number(price).toFixed(getDecimalCount(market.tickSize) + 1)
        : price;

    return (
      <Row
        ref={element}
        style={{ marginBottom: 3, fontSize: 12 }}
        onClick={onSizeClick}
      >
        <Col span={12} style={{ textAlign: 'right' }}>
          {formattedSize}
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Line
            data-width={sizePercent + '%'}
            data-bgcolor={
              side === 'buy'
                ? 'rgba(65, 199, 122, 0.6)'
                : 'rgba(242, 60, 105, 0.6)'
            }
          />
          <Price onClick={onPriceClick}>{formattedPrice}</Price>
        </Col>
      </Row>
    );
  },
  (prevProps, nextProps) =>
    isEqual(prevProps, nextProps, ['price', 'size', 'sizePercent']),
);

const MarkPriceComponent = React.memo(
  ({ markPrice }) => {
    const { market } = useMarket();
    const previousMarkPrice = usePrevious(markPrice);

    let markPriceColor =
      markPrice > previousMarkPrice
        ? '#41C77A'
        : markPrice < previousMarkPrice
        ? '#F23B69'
        : 'white';

    let formattedMarkPrice =
      markPrice &&
      market?.tickSize &&
      markPrice.toFixed(getDecimalCount(market.tickSize));

    return (
      <MarkPriceTitle
        justify="center"
        style={{
          borderTop: '1px solid #00073D',
          borderBottom: '1px solid #00073D',
          fontSize: 16,
        }}
      >
        <Col style={{ color: markPriceColor }}>
          {markPrice > previousMarkPrice && (
            <ArrowUpOutlined style={{ marginRight: 5 }} />
          )}
          {markPrice < previousMarkPrice && (
            <ArrowDownOutlined style={{ marginRight: 5 }} />
          )}
          {formattedMarkPrice || '----'}
        </Col>
      </MarkPriceTitle>
    );
  },
  (prevProps, nextProps) => isEqual(prevProps, nextProps, ['markPrice']),
);

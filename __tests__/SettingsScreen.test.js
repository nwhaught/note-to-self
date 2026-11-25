import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import SettingsScreen from '../src/screens/SettingsScreen';
import pkg from '../package.json';

const allText = tree =>
  tree.root
    .findAll(node => typeof node.props.children === 'string' || Array.isArray(node.props.children))
    .flatMap(node => [].concat(node.props.children))
    .filter(c => typeof c === 'string')
    .join('');

test('Settings renders and shows the app version', async () => {
  let tree;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<SettingsScreen navigation={{ reset: jest.fn() }} />);
  });
  expect(allText(tree)).toContain(pkg.version);
});

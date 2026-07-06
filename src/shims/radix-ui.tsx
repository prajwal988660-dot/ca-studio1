import * as React from 'react';

function primitive(tag: keyof React.JSX.IntrinsicElements) {
  return React.forwardRef<any, any>((props, ref) =>
    React.createElement(tag, { ref, ...props })
  );
}

const Portal: React.FC<{ children?: React.ReactNode }> = ({ children }) => <>{children}</>;

export const Dialog = {
  Root: primitive('div'),
  Trigger: primitive('button'),
  Portal,
  Close: primitive('button'),
  Overlay: primitive('div'),
  Content: primitive('div'),
  Title: primitive('h2'),
  Description: primitive('p'),
};

export const ScrollArea = {
  Root: primitive('div'),
  Viewport: primitive('div'),
  ScrollAreaScrollbar: primitive('div'),
  ScrollAreaThumb: primitive('div'),
  Corner: primitive('div'),
};

export const Separator = {
  Root: primitive('div'),
};

export const DropdownMenu = {
  Root: primitive('div'),
  Portal,
  Trigger: primitive('button'),
  Content: primitive('div'),
  Group: primitive('div'),
  Item: primitive('div'),
  CheckboxItem: primitive('div'),
  RadioGroup: primitive('div'),
  RadioItem: primitive('div'),
  ItemIndicator: primitive('span'),
  Label: primitive('div'),
  Separator: primitive('div'),
  Shortcut: primitive('span'),
  Sub: primitive('div'),
  SubTrigger: primitive('div'),
  SubContent: primitive('div'),
};

export const Switch = {
  Root: primitive('button'),
  Thumb: primitive('span'),
};

export const Label = {
  Root: primitive('label'),
};

export const RadioGroup = {
  Root: primitive('div'),
  Item: primitive('button'),
  Indicator: primitive('span'),
};

export const Select = {
  Root: primitive('div'),
  Group: primitive('div'),
  Value: primitive('span'),
  Trigger: primitive('button'),
  Portal,
  Content: primitive('div'),
  Viewport: primitive('div'),
  Label: primitive('div'),
  Item: primitive('div'),
  ItemText: primitive('span'),
  ItemIndicator: primitive('span'),
  ScrollUpButton: primitive('button'),
  ScrollDownButton: primitive('button'),
  Separator: primitive('div'),
  Icon: primitive('span'),
};

export const Tabs = {
  Root: primitive('div'),
  List: primitive('div'),
  Trigger: primitive('button'),
  Content: primitive('div'),
};

export const Checkbox = {
  Root: primitive('button'),
  Indicator: primitive('span'),
};

export const Popover = {
  Root: primitive('div'),
  Trigger: primitive('button'),
  Portal,
  Content: primitive('div'),
  Anchor: primitive('div'),
};

export const Slot = {
  Root: primitive('span'),
};


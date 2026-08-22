import { Tabs } from 'expo-router';
import {
  Box,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Truck,
  Users,
} from 'lucide-react-native';
import React from 'react';

import { useAppTheme } from '@/context/ThemeContext';

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Box color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="couriers"
        options={{
          title: 'Couriers',
          tabBarIcon: ({ color, size }) => <Truck color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => <ChartNoAxesCombined color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

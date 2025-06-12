import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = async () => {
  try {
    const response = await axios.post('https://odontoforense-backend.onrender.com/api/auth/login', {
      email,
      senha
    });

    await AsyncStorage.setItem('token', response.data.token);
    navigation.replace('HomeDashboard'); // novo nome da rota
  } catch (error) {
    console.error(error.response?.data || error.message);
    Alert.alert('Erro', error.response?.data?.msg || 'Erro ao fazer login');
  }
};

  return (
    <View style={styles.container}>
      
      <Text style={styles.title}>ODONTO<Text style={styles.highlight}>FORENSE</Text></Text>
      <Text style={styles.subtitle}>Sistema Especializado em Odontologia Forense</Text>

      <TextInput
        placeholder="Digite seu e-mail"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Digite sua senha"
        style={styles.input}
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Entrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', paddingHorizontal: 20 },
  logo: { height: 120, resizeMode: 'contain', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  highlight: { color: '#153777' },
  subtitle: { color: '#ccc', textAlign: 'center', marginBottom: 30 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 15 },
  button: { backgroundColor: '#153777', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});

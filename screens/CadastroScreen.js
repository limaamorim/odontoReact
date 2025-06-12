import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const CadastroScreen = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: ''
  });
  const [editingUserId, setEditingUserId] = useState(null);


  useEffect(() => {
    verificarAdmin();
    carregarUsuarios();
  }, []);

  const verificarAdmin = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setIsAdmin(payload?.usuario?.tipo === 'administrador');
    } catch (err) {
      console.warn('Token inválido:', err);
    }
  };

  const carregarUsuarios = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    
    try {
      const response = await axios.get('https://odontoforense-backend.onrender.com/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsuarios(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      Alert.alert('Erro', 'Não foi possível carregar os usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const payload = {
      nome: formData.nome.trim(),
      email: formData.email.trim(),
      senha: formData.senha.trim(),
      tipo: formData.tipo
    };

    if (editingUserId) {
      // Modo edição
      await axios.put(`https://odontoforense-backend.onrender.com/api/usuarios/${editingUserId}`, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      Alert.alert('Sucesso', 'Usuário atualizado com sucesso!');
    } else {
      // Modo criação
      await axios.post('https://odontoforense-backend.onrender.com/api/usuarios', payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      Alert.alert('Sucesso', 'Usuário cadastrado com sucesso!');
    }

    setModalVisible(false);
    setFormData({ nome: '', email: '', senha: '', tipo: '' });
    setEditingUserId(null);
    carregarUsuarios();
  } catch (error) {
    Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar usuário');
  }
};

const handleEdit = (usuario) => {
  setFormData({
    nome: usuario.nome,
    email: usuario.email,
    senha: '', // Senha não é carregada por segurança
    tipo: usuario.tipo
  });
  setEditingUserId(usuario._id);
  setModalVisible(true);
};
  const deletarUsuario = async (id) => {
    Alert.alert(
      'Confirmar',
      'Tem certeza que deseja excluir este usuário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`https://odontoforense-backend.onrender.com/api/usuarios/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Sucesso', 'Usuário excluído com sucesso!');
              carregarUsuarios();
            } catch (error) {
              console.error('Erro ao excluir usuário:', error);
              Alert.alert('Erro', 'Não foi possível excluir o usuário');
            }
          }
        }
      ]
    );
  };

  const getTipoBadge = (tipo) => {
    switch (tipo) {
      case 'administrador':
        return { backgroundColor: '#0d6efd', text: 'Administrador' };
      case 'perito':
        return { backgroundColor: '#198754', text: 'Perito' };
      case 'assistente':
        return { backgroundColor: '#6f42c1', text: 'Assistente' };
      default:
        return { backgroundColor: '#6c757d', text: tipo };
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.usuarioCard}>
      <View style={styles.usuarioInfo}>
        <Text style={styles.usuarioNome}>{item.nome}</Text>
        <Text style={styles.usuarioEmail}>{item.email}</Text>
        <View style={[styles.tipoBadge, { backgroundColor: getTipoBadge(item.tipo).backgroundColor }]}>
          <Text style={styles.tipoBadgeText}>{getTipoBadge(item.tipo).text}</Text>
        </View>
      </View>
      <View style={styles.usuarioAcoes}>
        <TouchableOpacity 
  style={styles.editarButton}
  onPress={() => handleEdit(item)}
>
  <Ionicons name="pencil" size={20} color="#6c757d" />
</TouchableOpacity>

        <TouchableOpacity 
          style={styles.excluirButton}
          onPress={() => deletarUsuario(item._id)}
        >
          <Ionicons name="trash" size={20} color="#dc3545" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={styles.restritoContainer}>
        <Ionicons name="lock-closed" size={48} color="#dc3545" />
        <Text style={styles.restritoTitulo}>Acesso Restrito</Text>
        <Text style={styles.restritoTexto}>Somente administradores podem acessar esta funcionalidade</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#153777" />
        <Text style={styles.loadingText}>Carregando usuários...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Usuários</Text>
        <TouchableOpacity 
          style={styles.novoUsuarioButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.novoUsuarioButtonText}>Novo Usuário</Text>
        </TouchableOpacity>
      </View>

      {usuarios.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people" size={48} color="#6c757d" />
          <Text style={styles.emptyText}>Nenhum usuário cadastrado</Text>
        </View>
      ) : (
        <FlatList
          data={usuarios}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para criar novo usuário */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                <Ionicons name="person-add" size={20} color="white" />
                Novo Usuário
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nome</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.nome}
                  onChangeText={(text) => setFormData({...formData, nome: text})}
                  placeholder="Digite o nome completo"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Digite o email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Senha</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.senha}
                  onChangeText={(text) => setFormData({...formData, senha: text})}
                  placeholder="Digite a senha"
                  secureTextEntry
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tipo de Usuário</Text>
                <View style={styles.selectContainer}>
                  <Text style={styles.selectText}>
                    {formData.tipo ? 
                      formData.tipo.charAt(0).toUpperCase() + formData.tipo.slice(1) : 
                      'Selecione...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#6c757d" />
                </View>
                <View style={styles.tipoOptions}>
                  <TouchableOpacity 
                    style={[
                      styles.tipoOption, 
                      formData.tipo === 'administrador' && styles.tipoOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, tipo: 'administrador'})}
                  >
                    <Text style={[
                      styles.tipoOptionText,
                      formData.tipo === 'administrador' && styles.tipoOptionTextSelected
                    ]}>
                      Administrador
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.tipoOption, 
                      formData.tipo === 'perito' && styles.tipoOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, tipo: 'perito'})}
                  >
                    <Text style={[
                      styles.tipoOptionText,
                      formData.tipo === 'perito' && styles.tipoOptionTextSelected
                    ]}>
                      Perito
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.tipoOption, 
                      formData.tipo === 'assistente' && styles.tipoOptionSelected
                    ]}
                    onPress={() => setFormData({...formData, tipo: 'assistente'})}
                  >
                    <Text style={[
                      styles.tipoOptionText,
                      formData.tipo === 'assistente' && styles.tipoOptionTextSelected
                    ]}>
                      Assistente
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={styles.submitButtonText}>Cadastrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  restritoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restritoTitulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginTop: 16,
  },
  restritoTexto: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  novoUsuarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  novoUsuarioButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  usuarioCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  usuarioInfo: {
    flex: 1,
  },
  usuarioNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  usuarioEmail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  tipoBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  tipoBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  usuarioAcoes: {
    flexDirection: 'row',
  },
  editarButton: {
    marginRight: 12,
  },
  excluirButton: {},
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#153777',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d6efd',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#495057',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
  },
  selectText: {
    fontSize: 14,
    color: '#495057',
  },
  tipoOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tipoOption: {
    backgroundColor: '#e9ecef',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tipoOptionSelected: {
    backgroundColor: '#0d6efd',
  },
  tipoOptionText: {
    fontSize: 12,
    color: '#495057',
  },
  tipoOptionTextSelected: {
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default CadastroScreen;
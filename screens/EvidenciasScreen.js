// EvidenciasScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Modal, 
  TextInput, 
  Alert, 
  Image, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EvidenciasScreen = () => {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCaso, setSelectedCaso] = useState(null);
  const [formData, setFormData] = useState({
    tipo: '',
    descricao: '',
  });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    carregarCasos();
  }, []);

  const carregarCasos = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get('https://odontoforense-backend.onrender.com/api/casos?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCasos(response.data.data.docs || response.data.data);
    } catch (error) {
      console.error('Erro ao carregar casos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os casos');
    } finally {
      setLoading(false);
    }
  };

  const selecionarImagem = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!formData.tipo || !formData.descricao || !image || !selectedCaso) {
      Alert.alert('Atenção', 'Preencha todos os campos e selecione uma imagem');
      return;
    }

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      
      // Criar FormData para upload
      const formDataToSend = new FormData();
      formDataToSend.append('tipo', formData.tipo);
      formDataToSend.append('descricao', formData.descricao);
      
      // Adicionar a imagem ao FormData
      const localUri = image;
const filename = localUri.split('/').pop();
const match = /\.(\w+)$/.exec(filename || '');
const ext = match ? match[1] : 'jpg';
const type = `image/${ext}`;

formDataToSend.append('imagem', {
  uri: localUri,
  name: filename,
  type,
});


const response = await axios.post(
  `https://odontoforense-backend.onrender.com/api/casos/${selectedCaso._id}/evidencias`,
  formDataToSend,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  }
);

      Alert.alert('Sucesso', 'Evidência cadastrada com sucesso!');
      setModalVisible(false);
      setFormData({ tipo: '', descricao: '' });
      setImage(null);
      carregarCasos();
    } catch (error) {
      console.error('Erro ao enviar evidência:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao cadastrar evidência');
    } finally {
      setUploading(false);
    }
  };

  const abrirModal = (caso) => {
    setSelectedCaso(caso);
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <View style={styles.casoCard}>
      <Text style={styles.casoNumero}>Caso #{item.numeroCaso || 'Sem número'}</Text>
      <Text style={styles.casoTitulo}>{item.titulo || 'Sem título'}</Text>
      <Text style={styles.casoDescricao} numberOfLines={2}>
        {item.descricao || 'Sem descrição fornecida.'}
      </Text>
      <TouchableOpacity 
        style={styles.botaoAdicionar}
        onPress={() => abrirModal(item)}
      >
        <Ionicons name="add" size={20} color="#0d6efd" />
        <Text style={styles.botaoAdicionarTexto}>Adicionar Evidência</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#153777" />
        <Text style={styles.loadingText}>Carregando casos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="folder-open" size={28} color="#153777" />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Casos Disponíveis</Text>
          <Text style={styles.headerSubtitle}>Clique em um caso para adicionar evidências</Text>
        </View>
      </View>

      {casos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open" size={48} color="#6c757d" />
          <Text style={styles.emptyText}>Nenhum caso encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={casos}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}

      {/* Modal para adicionar evidência */}
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
                <Ionicons name="add-circle" size={20} color="white" /> Nova Evidência
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tipo da Evidência</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Digite o tipo da evidência"
                  value={formData.tipo}
                  onChangeText={(text) => setFormData({...formData, tipo: text})}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descrição</Text>
                <TextInput
                  style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                  placeholder="Descreva a evidência"
                  multiline
                  value={formData.descricao}
                  onChangeText={(text) => setFormData({...formData, descricao: text})}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Imagem da Evidência</Text>
                <TouchableOpacity 
                  style={styles.uploadArea}
                  onPress={selecionarImagem}
                >
                  {image ? (
                    <Image 
                      source={{ uri: image }} 
                      style={styles.imagePreview}
                      resizeMode="contain"
                    />
                  ) : (
                    <Text style={styles.uploadText}>Clique para selecionar a imagem</Text>
                  )}
                </TouchableOpacity>
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
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="white" />
                    <Text style={styles.submitButtonText}>Cadastrar Evidência</Text>
                  </>
                )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextContainer: {
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6c757d',
  },
  listContainer: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  casoCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  casoNumero: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#153777',
    marginBottom: 4,
  },
  casoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  casoDescricao: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
  },
  botaoAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0d6efd',
    borderRadius: 8,
    padding: 8,
  },
  botaoAdicionarTexto: {
    color: '#0d6efd',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
    backgroundColor: '#153777',
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
  uploadArea: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#6c757d',
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#495057',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default EvidenciasScreen;
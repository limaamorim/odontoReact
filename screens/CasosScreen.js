import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Image, Linking } from 'react-native';


const CasosScreen = () => {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [modalVisualizarVisible, setModalVisualizarVisible] = useState(false);
  const [selectedCaso, setSelectedCaso] = useState(null);
  const [formData, setFormData] = useState({
    numeroCaso: '',
    titulo: '',
    descricao: '',
    dataOcorrido: '',
    local: '',
    status: 'Aberto'
  });
  const [vitimas, setVitimas] = useState([]);

  useEffect(() => {
    carregarCasos();
  }, []);

  const carregarCasos = async () => {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    
    try {
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

const handleSearch = (text) => {
  setSearchTerm(text);
};

const filteredCasos = casos.filter(caso => {
  if (!searchTerm) return true; // Retorna todos os casos se não houver termo de busca
  
  const searchText = `${caso.numeroCaso || ''} ${caso.titulo || ''} ${caso.descricao || ''} ${caso.local || ''} ${caso.status || ''}`.toLowerCase();
  return searchText.includes(searchTerm.toLowerCase());
});

  const abrirModalEdicao = async (caso) => {
  setSelectedCaso(caso);
  setFormData({
    numeroCaso: caso.numeroCaso,
    titulo: caso.titulo,
    descricao: caso.descricao,
    dataOcorrido: caso.dataOcorrido?.substring(0, 10),
    local: caso.local,
    status: caso.status
  });

  try {
    const token = await AsyncStorage.getItem('token');
    const res = await axios.get(`https://odontoforense-backend.onrender.com/api/vitimas/casos/${caso._id}/vitimas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setVitimas(res.data || []);
  } catch (err) {
    console.error('Erro ao carregar vítimas:', err);
  }

  setModalEditarVisible(true);
};


 const visualizarCaso = async (caso) => {
  setSelectedCaso({ ...caso, evidencias: [], vitimas: [] });
  setModalVisualizarVisible(true);

  try {
    // Buscar evidências
    const evidRes = await axios.get(`https://odontoforense-backend.onrender.com/api/evidencias?casoId=${caso._id}`);
    const evidencias = evidRes.status === 200 ? evidRes.data : [];

    // Buscar vítimas
    const token = await AsyncStorage.getItem('token');
    const vitimaRes = await axios.get(`https://odontoforense-backend.onrender.com/api/vitimas/casos/${caso._id}/vitimas`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const vitimas = vitimaRes.status === 200 ? vitimaRes.data : [];

    // Atualiza selectedCaso com os dados completos
    setSelectedCaso(prev => ({
      ...prev,
      evidencias,
      vitimas
    }));
  } catch (err) {
    console.error("Erro ao carregar dados do caso:", err);
  }
};


  const deletarCaso = async (id) => {
    Alert.alert(
      'Confirmar',
      'Tem certeza que deseja deletar este caso? Essa ação não poderá ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Deletar', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              await axios.delete(`https://odontoforense-backend.onrender.com/api/casos/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Sucesso', 'Caso deletado com sucesso!');
              carregarCasos();
            } catch (error) {
              console.error('Erro ao deletar caso:', error);
              Alert.alert('Erro', 'Não foi possível deletar o caso');
            }
          }
        }
      ]
    );
  };

  const adicionarVitima = () => {
    setVitimas([...vitimas, {
      nic: '',
      nome: '',
      genero: 'masculino',
      idade: '',
      corEtnia: ''
    }]);
  };

  const removerVitima = (index) => {
    const novasVitimas = [...vitimas];
    novasVitimas.splice(index, 1);
    setVitimas(novasVitimas);
  };

  const atualizarVitima = (index, campo, valor) => {
    const novasVitimas = [...vitimas];
    novasVitimas[index][campo] = valor;
    setVitimas(novasVitimas);
  };

  const handleSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
        ...formData,
        vitimas: vitimas.map(v => ({
          ...v,
          idade: v.idade ? parseInt(v.idade) : undefined
        }))
      };

      await axios.post('https://odontoforense-backend.onrender.com/api/casos', payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      Alert.alert('Sucesso', 'Caso criado com sucesso!');
      setModalVisible(false);
      setFormData({
        numeroCaso: '',
        titulo: '',
        descricao: '',
        dataOcorrido: '',
        local: '',
        status: 'Aberto'
      });
      setVitimas([]);
      carregarCasos();
    } catch (error) {
      console.error('Erro ao criar caso:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao criar caso');
    }
  };

  const handleEditarSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const payload = {
      numeroCaso: formData.numeroCaso,
      titulo: formData.titulo,
      descricao: formData.descricao,
      dataOcorrido: formData.dataOcorrido,
      local: formData.local,
      status: formData.status,
      vitimas: vitimas.map(v => ({
        ...v,
        idade: v.idade ? parseInt(v.idade) : undefined
      }))
    };


      await axios.put(`https://odontoforense-backend.onrender.com/api/casos/${selectedCaso._id}`, payload, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      Alert.alert('Sucesso', 'Caso atualizado com sucesso!');
      setModalEditarVisible(false);
      carregarCasos();
    } catch (error) {
      console.error('Erro ao atualizar caso:', error);
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar caso');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aberto': return '#198754';
      case 'em andamento': return '#fd7e14';
      case 'fechado': return '#dc3545';
      default: return '#198754';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.casoCard}>
      <View style={styles.casoHeader}>
        <View>
          <Text style={styles.casoNumero}>Caso - {item.numeroCaso || 'Sem número'}</Text>
          <Text style={styles.casoTitulo}>{item.titulo || 'Sem título'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status || 'Aberto'}</Text>
          </View>
          {item.vitimas?.length > 0 && (
            <View style={styles.vitimasInfo}>
              <Ionicons name="people" size={16} color="#6c757d" />
              <Text style={styles.vitimasText}>{item.vitimas.length} vítima(s)</Text>
            </View>
          )}
        </View>
        <View style={styles.acoesContainer}>
          <TouchableOpacity 
            style={styles.acaoButton} 
            onPress={() => visualizarCaso(item)}
          >
            <Ionicons name="eye" size={20} color="#0d6efd" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acaoButton} 
            onPress={() => abrirModalEdicao(item)}
          >
            <Ionicons name="pencil" size={20} color="#6c757d" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.acaoButton} 
            onPress={() => deletarCaso(item._id)}
          >
            <Ionicons name="trash" size={20} color="#dc3545" />
          </TouchableOpacity>
        </View>
      </View>
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
        <Text style={styles.title}>Casos</Text>
        <View style={styles.headerActions}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6c757d" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar casos..."
              placeholderTextColor="#6c757d"
              value={searchTerm}
              onChangeText={handleSearch}
            />
          </View>
          <TouchableOpacity 
            style={styles.novoCasoButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.novoCasoButtonText}>Novo Caso</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredCasos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open" size={48} color="#6c757d" />
          <Text style={styles.emptyText}>Nenhum caso encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCasos}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para criar novo caso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📁 Novo Caso</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Número do Caso</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.numeroCaso}
                  onChangeText={(text) => setFormData({...formData, numeroCaso: text})}
                  placeholder="Digite o número do caso"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Título</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.titulo}
                  onChangeText={(text) => setFormData({...formData, titulo: text})}
                  placeholder="Digite o título do caso"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descrição</Text>
                <TextInput
                  style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                  value={formData.descricao}
                  onChangeText={(text) => setFormData({...formData, descricao: text})}
                  placeholder="Descreva o caso"
                  multiline
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Data do Ocorrido</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.dataOcorrido}
                    onChangeText={(text) => setFormData({...formData, dataOcorrido: text})}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Local</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.local}
                    onChangeText={(text) => setFormData({...formData, local: text})}
                    placeholder="Digite o local"
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status do Caso</Text>
                <View style={styles.selectContainer}>
                  <Text style={styles.selectText}>{formData.status}</Text>
                  <Ionicons name="chevron-down" size={16} color="#6c757d" />
                </View>
              </View>
              
              <View style={styles.vitimasSection}>
                <View style={styles.vitimasHeader}>
                  <Text style={styles.vitimasTitle}>
                    <Text style={styles.vitimaCounter}>{vitimas.length}</Text> Vítima(s)
                  </Text>
                  <TouchableOpacity 
                    style={styles.adicionarVitimaButton}
                    onPress={adicionarVitima}
                  >
                    <Ionicons name="add" size={16} color="#0d6efd" />
                    <Text style={styles.adicionarVitimaText}>Adicionar Vítima</Text>
                  </TouchableOpacity>
                </View>
                
                {vitimas.length === 0 ? (
                  <View style={styles.nenhumaVitimaContainer}>
                    <Ionicons name="person" size={32} color="#6c757d" />
                    <Text style={styles.nenhumaVitimaText}>Nenhuma vítima adicionada</Text>
                  </View>
                ) : (
                  vitimas.map((vitima, index) => (
                    <View key={index} style={styles.vitimaCard}>
                      <View style={styles.vitimaCardHeader}>
                        <Text style={styles.vitimaCardTitle}>
                          <Ionicons name="person" size={16} color="#0d6efd" />
                          Vítima {index + 1}
                        </Text>
                        <TouchableOpacity 
                          style={styles.removerVitimaButton}
                          onPress={() => removerVitima(index)}
                        >
                          <Ionicons name="trash" size={16} color="#dc3545" />
                          <Text style={styles.removerVitimaText}>Remover</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.vitimaFormRow}>
                        <View style={styles.vitimaFormGroup}>
                          <Text style={styles.vitimaFormLabel}>Nic</Text>
                          <TextInput
                            style={styles.vitimaFormInput}
                            value={vitima.nic}
                            onChangeText={(text) => atualizarVitima(index, 'nic', text)}
                            placeholder="Digite o NIC"
                          />
                        </View>
                        
                        <View style={styles.vitimaFormGroup}>
                          <Text style={styles.vitimaFormLabel}>Nome</Text>
                          <TextInput
                            style={styles.vitimaFormInput}
                            value={vitima.nome}
                            onChangeText={(text) => atualizarVitima(index, 'nome', text)}
                            placeholder="Digite o nome"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.vitimaFormRow}>
                        <View style={styles.vitimaFormGroup}>
                          <Text style={styles.vitimaFormLabel}>Gênero</Text>
                          <View style={styles.vitimaSelectContainer}>
                            <Text style={styles.vitimaSelectText}>{vitima.genero}</Text>
                            <Ionicons name="chevron-down" size={16} color="#6c757d" />
                          </View>
                        </View>
                        
                        <View style={styles.vitimaFormGroup}>
                          <Text style={styles.vitimaFormLabel}>Idade</Text>
                          <TextInput
                            style={styles.vitimaFormInput}
                            value={vitima.idade}
                            onChangeText={(text) => atualizarVitima(index, 'idade', text)}
                            placeholder="Digite a idade"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.vitimaFormGroup}>
                        <Text style={styles.vitimaFormLabel}>Cor/Etnia</Text>
                        <TextInput
                          style={styles.vitimaFormInput}
                          value={vitima.corEtnia}
                          onChangeText={(text) => atualizarVitima(index, 'corEtnia', text)}
                          placeholder="Digite a cor/etnia"
                        />
                      </View>
                    </View>
                  ))
                )}
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
                <Text style={styles.submitButtonText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para editar caso */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalEditarVisible}
        onRequestClose={() => setModalEditarVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Editar Caso</Text>
              <TouchableOpacity onPress={() => setModalEditarVisible(false)}>
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Número do Caso</Text>

                <TextInput
                  style={styles.formInput}
                  value={formData.numeroCaso}
                  onChangeText={(text) => setFormData({...formData, numeroCaso: text})}
                />
              </View>
              <View style={styles.vitimasSection}>
  <View style={styles.vitimasHeader}>
    <Text style={styles.vitimasTitle}>
      <Text style={styles.vitimaCounter}>{vitimas.length}</Text> Vítima(s)
    </Text>
    <TouchableOpacity 
      style={styles.adicionarVitimaButton}
      onPress={adicionarVitima}
    >
      <Ionicons name="add" size={16} color="#0d6efd" />
      <Text style={styles.adicionarVitimaText}>Adicionar Vítima</Text>
    </TouchableOpacity>
  </View>

  {vitimas.length === 0 ? (
    <View style={styles.nenhumaVitimaContainer}>
      <Ionicons name="person" size={32} color="#6c757d" />
      <Text style={styles.nenhumaVitimaText}>Nenhuma vítima adicionada</Text>
    </View>
  ) : (
    vitimas.map((vitima, index) => (
      <View key={index} style={styles.vitimaCard}>
        <View style={styles.vitimaCardHeader}>
          <Text style={styles.vitimaCardTitle}>
            <Ionicons name="person" size={16} color="#0d6efd" />
            Vítima {index + 1}
          </Text>
          <TouchableOpacity 
            style={styles.removerVitimaButton}
            onPress={() => removerVitima(index)}
          >
            <Ionicons name="trash" size={16} color="#dc3545" />
            <Text style={styles.removerVitimaText}>Remover</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.vitimaFormRow}>
          <View style={styles.vitimaFormGroup}>
            <Text style={styles.vitimaFormLabel}>Nic</Text>
            <TextInput
              style={styles.vitimaFormInput}
              value={vitima.nic}
              onChangeText={(text) => atualizarVitima(index, 'nic', text)}
              placeholder="Digite o NIC"
            />
          </View>
          <View style={styles.vitimaFormGroup}>
            <Text style={styles.vitimaFormLabel}>Nome</Text>
            <TextInput
              style={styles.vitimaFormInput}
              value={vitima.nome}
              onChangeText={(text) => atualizarVitima(index, 'nome', text)}
              placeholder="Digite o nome"
            />
          </View>
        </View>

        <View style={styles.vitimaFormRow}>
          <View style={styles.vitimaFormGroup}>
            <Text style={styles.vitimaFormLabel}>Gênero</Text>
            <TextInput
              style={styles.vitimaFormInput}
              value={vitima.genero}
              onChangeText={(text) => atualizarVitima(index, 'genero', text)}
              placeholder="Digite o gênero"
            />
          </View>
          <View style={styles.vitimaFormGroup}>
            <Text style={styles.vitimaFormLabel}>Idade</Text>
            <TextInput
              style={styles.vitimaFormInput}
              value={vitima.idade}
              onChangeText={(text) => atualizarVitima(index, 'idade', text)}
              placeholder="Digite a idade"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.vitimaFormGroup}>
          <Text style={styles.vitimaFormLabel}>Cor/Etnia</Text>
          <TextInput
            style={styles.vitimaFormInput}
            value={vitima.corEtnia}
            onChangeText={(text) => atualizarVitima(index, 'corEtnia', text)}
            placeholder="Digite a cor/etnia"
          />
        </View>
      </View>
    ))
  )}
</View>

              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Título</Text>
                <TextInput
                  style={styles.formInput}
                  value={formData.titulo}
                  onChangeText={(text) => setFormData({...formData, titulo: text})}
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descrição</Text>
                <TextInput
                  style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]}
                  value={formData.descricao}
                  onChangeText={(text) => setFormData({...formData, descricao: text})}
                  multiline
                />
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Data do Ocorrido</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.dataOcorrido}
                    onChangeText={(text) => setFormData({...formData, dataOcorrido: text})}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Local</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.local}
                    onChangeText={(text) => setFormData({...formData, local: text})}
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.selectContainer}>
                  <Text style={styles.selectText}>{formData.status}</Text>
                  <Ionicons name="chevron-down" size={16} color="#6c757d" />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalEditarVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleEditarSubmit}
              >
                <Text style={styles.submitButtonText}>Salvar Alterações</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para visualizar caso */}
      <Modal
  animationType="slide"
  transparent={true}
  visible={modalVisualizarVisible}
  onRequestClose={() => setModalVisualizarVisible(false)}
>
  <View style={styles.modalContainer}>
    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
      <View style={[styles.modalHeader, { backgroundColor: '#17a2b8' }]}>
        <Text style={[styles.modalTitle, { color: 'white' }]}>🔍 Detalhes do Caso</Text>
        <TouchableOpacity onPress={() => setModalVisualizarVisible(false)}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.modalBody}>
        <Text style={styles.detalheTitulo}>
          <Ionicons name="folder" size={20} color="#2c3e50" />
          {selectedCaso?.titulo || 'Sem título'}
          <Text style={[styles.detalheStatus, { color: getStatusColor(selectedCaso?.status) }]}>
            {selectedCaso?.status || 'Aberto'}
          </Text>
        </Text>

        {/* Informações do Caso */}
        <View style={styles.detalheSection}>
          <Text style={styles.detalheSectionTitle}>
            <Ionicons name="information-circle" size={18} color="#3498db" />
            Informações do Caso
          </Text>

          <View style={styles.detalheItem}>
            <Text style={styles.detalheLabel}>Número:</Text>
            <Text style={styles.detalheValue}>{selectedCaso?.numeroCaso || '-'}</Text>
          </View>

          <View style={styles.detalheItem}>
            <Text style={styles.detalheLabel}>Status:</Text>
            <Text style={styles.detalheValue}>{selectedCaso?.status || 'Aberto'}</Text>
          </View>

          <View style={styles.detalheItem}>
            <Text style={styles.detalheLabel}>Local:</Text>
            <Text style={styles.detalheValue}>{selectedCaso?.local || '-'}</Text>
          </View>

          <View style={styles.detalheItem}>
            <Text style={styles.detalheLabel}>Data:</Text>
            <Text style={styles.detalheValue}>
              {selectedCaso?.dataOcorrido
                ? new Date(selectedCaso.dataOcorrido).toLocaleDateString('pt-BR')
                : 'Não informada'}
            </Text>
          </View>

          <View style={styles.detalheItem}>
            <Text style={styles.detalheLabel}>Descrição:</Text>
            <Text style={styles.detalheValue}>
              {selectedCaso?.descricao || 'Nenhuma descrição fornecida'}
            </Text>
          </View>
        </View>

        {/* Vítimas */}
        <View style={styles.detalheSection}>
          <Text style={styles.detalheSectionTitle}>
            <Ionicons name="people" size={18} color="#3498db" />
            Vítimas
          </Text>

          {selectedCaso?.vitimas?.length > 0 ? (
            selectedCaso.vitimas.map((vitima, index) => (
              <View key={index} style={styles.vitimaDetalheCard}>
                <Text style={styles.vitimaDetalheTitle}>
                  <Ionicons name="person" size={16} color="#e53e3e" />
                  Vítima {index + 1}
                </Text>

                <View style={styles.vitimaDetalheItem}>
                  <Text style={styles.vitimaDetalheLabel}>NIC:</Text>
                  <Text style={styles.vitimaDetalheValue}>{vitima.nic || '-'}</Text>
                </View>

                <View style={styles.vitimaDetalheItem}>
                  <Text style={styles.vitimaDetalheLabel}>Nome:</Text>
                  <Text style={styles.vitimaDetalheValue}>{vitima.nome || '-'}</Text>
                </View>

                <View style={styles.vitimaDetalheItem}>
                  <Text style={styles.vitimaDetalheLabel}>Gênero:</Text>
                  <Text style={styles.vitimaDetalheValue}>{vitima.genero || '-'}</Text>
                </View>

                <View style={styles.vitimaDetalheItem}>
                  <Text style={styles.vitimaDetalheLabel}>Idade:</Text>
                  <Text style={styles.vitimaDetalheValue}>{vitima.idade || '-'}</Text>
                </View>

                <View style={styles.vitimaDetalheItem}>
                  <Text style={styles.vitimaDetalheLabel}>Cor/Etnia:</Text>
                  <Text style={styles.vitimaDetalheValue}>{vitima.corEtnia || '-'}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.nenhumaVitimaContainer}>
              <Ionicons name="person" size={32} color="#6c757d" />
              <Text style={styles.nenhumaVitimaText}>Nenhuma vítima cadastrada</Text>
            </View>
          )}
        </View>

        {/* Evidências */}
        <View style={styles.detalheSection}>
          <Text style={styles.detalheSectionTitle}>
            <Ionicons name="camera" size={18} color="#3498db" />
            Evidências
          </Text>

          {selectedCaso?.evidencias?.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedCaso.evidencias.map((evidencia, index) => (
                <View key={index} style={{ marginRight: 12, alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(`https://odontoforense-backend.onrender.com/uploads/${evidencia.imagem}`)
                    }
                  >
                    <Image
                      source={{ uri: `https://odontoforense-backend.onrender.com/uploads/${evidencia.imagem}` }}
                      style={{ width: 100, height: 100, borderRadius: 8 }}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>
                    {evidencia.nome || 'Sem nome'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ color: '#6c757d' }}>Nenhuma evidência registrada</Text>
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'white',
  borderRadius: 8,
  paddingHorizontal: 10,
  height: 40,
  marginRight: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
  flex: 1, // Adicione isso para melhorar o layout
},
searchIcon: {
  marginRight: 8,
},
searchInput: {
  flex: 1,
  height: 40,
  color: '#495057',
},
  novoCasoButton: {
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
  novoCasoButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  casoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  casoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  casoNumero: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  casoTitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  vitimasInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitimasText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  acoesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acaoButton: {
    marginLeft: 12,
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
  formRow: {
    flexDirection: 'row',
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
  vitimasSection: {
    marginTop: 24,
  },
  vitimasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vitimasTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  vitimaCounter: {
    backgroundColor: '#0d6efd',
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    marginRight: 8,
  },
  adicionarVitimaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adicionarVitimaText: {
    color: '#0d6efd',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  nenhumaVitimaContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  nenhumaVitimaText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  vitimaCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  vitimaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vitimaCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d6efd',
    flexDirection: 'row',
    alignItems: 'center',
  },
  removerVitimaButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removerVitimaText: {
    color: '#dc3545',
    fontSize: 12,
    marginLeft: 4,
  },
  vitimaFormRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vitimaFormGroup: {
    flex: 1,
    marginRight: 8,
  },
  vitimaFormLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  vitimaFormInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#495057',
  },
  vitimaSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 6
      },
  vitimaSelectText: {
    fontSize: 12,
    color: '#495057',
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
  detalheTitulo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detalheStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  detalheSection: {
    marginBottom: 24,
  },
  detalheSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detalheItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detalheLabel: {
    width: 100,
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  detalheValue: {
    flex: 1,
    fontSize: 14,
    color: '#495057',
  },
  vitimaDetalheCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  vitimaDetalheTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e53e3e',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  vitimaDetalheItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  vitimaDetalheLabel: {
    width: 80,
    fontSize: 12,
    color: '#6c757d',
  },
  vitimaDetalheValue: {
    flex: 1,
    fontSize: 12,
    color: '#495057',
  },
  limparBuscaButton: {
  marginTop: 16,
  padding: 8,
  backgroundColor: '#e9ecef',
  borderRadius: 6,
},
limparBuscaText: {
  color: '#0d6efd',
  fontSize: 14,
},
});

export default CasosScreen;
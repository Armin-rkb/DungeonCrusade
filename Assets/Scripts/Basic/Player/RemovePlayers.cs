using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class RemovePlayers : MonoBehaviour {

    private List<GameObject> _playerObjects;

    public void RemovePlayer()
    {
        foreach (GameObject player in _playerObjects)
            Destroy(player.gameObject);
    }
}

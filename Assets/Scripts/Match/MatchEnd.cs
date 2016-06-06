using UnityEngine;
using System.Collections;

public class MatchEnd : MonoBehaviour {

    [SerializeField]
    private RoundManager _roundManager;

    GameObject[] _inGamePlayers;

    void Awake()
    {
        _roundManager.OnGameEnd += RemoveCharacters;
    }

    void RemoveCharacters()
    {
        _inGamePlayers = GameObject.FindGameObjectsWithTag(GameTags.player);

        foreach (GameObject player in _inGamePlayers)
            Destroy(player.gameObject);
    }
}

using UnityEngine;
using UnityEngine.UI;
using System.Collections;

public class PlayerStock : MonoBehaviour {

    [SerializeField]
    private Image[] _pStocks;

    [SerializeField]
    private Sprite _breakStock;

    [SerializeField]
    private PlayerDeath _playerDeath;

	void Awake()
    {
        _playerDeath.OnPlayerDeath += BreakStock;
    }

    void BreakStock()
    {
        if (_playerDeath.GetDeath && _playerDeath.GetPlayerNumber == 1)
        {
            _pStocks[0].sprite = _breakStock;
        }

        else if (_playerDeath.GetDeath && _playerDeath.GetPlayerNumber == 2)
        {
            _pStocks[1].sprite = _breakStock;
        }

        else if (_playerDeath.GetDeath && _playerDeath.GetPlayerNumber == 3)
        {
            print("P3 IZ DED");
            _pStocks[2].sprite = _breakStock;
        }

        else if (_playerDeath.GetDeath && _playerDeath.GetPlayerNumber == 4)
        {
            _pStocks[3].sprite = _breakStock;
        }
    }

}

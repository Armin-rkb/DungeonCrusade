using UnityEngine;
using System.Collections;

public class PlayerFootStool : MonoBehaviour {

    [SerializeField]
    private PlayerMovement _playerMovement;

	void OnTriggerEnter2D(Collider2D player)
    {
        if (player.gameObject.CompareTag(GameTags.footstool))
        {
                this.GetComponent<Rigidbody2D>().velocity = new Vector2(Random.Range(-5,5), 5);
        }
    }
}

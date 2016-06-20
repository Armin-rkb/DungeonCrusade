using UnityEngine;
using System.Collections;

public class DuckExplosion : MonoBehaviour
{
    //Explosion Collision circle
    [SerializeField] private CircleCollider2D collider;
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;

    void Start()
    {
        InvokeRepeating("ExplosionSound", 0, 0.25f);
        InvokeRepeating("TriggerCollider", 0.15f, 0.15f);
    }

    void TriggerCollider()
    {
        if (collider.enabled == true)
            collider.enabled = false;
        else
            collider.enabled = true;
    }

    void ExplosionSound()
    {
        SoundManager.PlayAudioClip(AudioData.Sock);
    }

    void Hit(GameObject player)
    {
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (transform.position - rbPlayer.transform.position).normalized;
        playerMovement.ApplyKnockback(currPosition * knockback);
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
    }

    void OnTriggerEnter2D(Collider2D coll)
    {
        if (coll != null)
        {
            if (coll.CompareTag(GameTags.player))
                Hit(coll.gameObject);
        }
    }
}
